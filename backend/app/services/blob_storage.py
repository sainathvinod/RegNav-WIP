"""Object storage abstraction for archived raw documents.

Two backends are supported:

- ``AzureBlobBackend`` — Azure Blob Storage via ``DefaultAzureCredential``.
  Used in staging / production whenever ``AZURE_STORAGE_ACCOUNT_URL`` is set.

- ``LocalDiskBackend`` — writes blobs to ``settings.storage_local_dir``.
  Used in dev, tests, and CI so the system runs without Azure.

Callers should not import the backends directly — use :func:`get_storage`
which returns the right one based on configuration.
"""

from __future__ import annotations

import asyncio
import contextlib
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class BlobStorage(ABC):
    """Backend interface — `put` writes bytes, `get` returns them."""

    @abstractmethod
    async def put(self, key: str, data: bytes, content_type: str) -> None: ...

    @abstractmethod
    async def get(self, key: str) -> bytes: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...


class LocalDiskBackend(BlobStorage):
    """Writes archives under ``settings.storage_local_dir``.

    The directory is created on demand. Keys are treated as relative paths
    and the leading-slash / ``..`` components are stripped to keep writes
    inside the configured root.
    """

    def __init__(self, root: str | None = None) -> None:
        self._root = Path(root or settings.storage_local_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    def _path_for(self, key: str) -> Path:
        clean = key.lstrip("/").replace("..", "")
        return self._root / clean

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        target = self._path_for(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(target.write_bytes, data)
        logger.info("blob_put_local", key=key, bytes=len(data), content_type=content_type)

    async def get(self, key: str) -> bytes:
        target = self._path_for(key)
        if not target.exists():
            raise FileNotFoundError(f"Archive blob not found: {key}")
        return await asyncio.to_thread(target.read_bytes)

    async def delete(self, key: str) -> None:
        target = self._path_for(key)
        if target.exists():
            await asyncio.to_thread(os.remove, target)


class AzureBlobBackend(BlobStorage):
    """Azure Blob Storage backed by Managed Identity.

    Imported lazily so the dependency is only required when Azure is used.
    """

    def __init__(self, account_url: str, container: str) -> None:
        # Import lazily so unit tests and dev runs without azure-storage-blob
        # installed still work via the LocalDiskBackend path.
        from azure.identity.aio import DefaultAzureCredential
        from azure.storage.blob.aio import BlobServiceClient

        self._credential = DefaultAzureCredential()
        self._service = BlobServiceClient(account_url=account_url, credential=self._credential)
        self._container = container

    async def _container_client(self):  # type: ignore[no-untyped-def]
        client = self._service.get_container_client(self._container)
        # Already exists → 409; we ignore both that and any transient
        # network error so the first put doesn't fail loudly when the
        # container is provisioned out-of-band.
        with contextlib.suppress(Exception):
            await client.create_container()
        return client

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        from azure.storage.blob import ContentSettings

        container = await self._container_client()
        blob = container.get_blob_client(key)
        await blob.upload_blob(
            data,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        logger.info("blob_put_azure", key=key, bytes=len(data), content_type=content_type)

    async def get(self, key: str) -> bytes:
        container = await self._container_client()
        blob = container.get_blob_client(key)
        stream = await blob.download_blob()
        return await stream.readall()

    async def delete(self, key: str) -> None:
        container = await self._container_client()
        blob = container.get_blob_client(key)
        try:
            await blob.delete_blob()
        except Exception as exc:
            logger.warning("blob_delete_failed", key=key, error=str(exc))


_storage: BlobStorage | None = None


def get_storage() -> BlobStorage:
    """Lazy singleton — returns the backend selected by config."""
    global _storage
    if _storage is not None:
        return _storage
    if settings.azure_storage_account_url:
        _storage = AzureBlobBackend(
            account_url=settings.azure_storage_account_url,
            container=settings.azure_storage_container,
        )
        logger.info(
            "blob_storage_initialized",
            backend="azure",
            container=settings.azure_storage_container,
        )
    else:
        _storage = LocalDiskBackend()
        logger.info(
            "blob_storage_initialized",
            backend="local",
            root=settings.storage_local_dir,
        )
    return _storage


def reset_storage_for_tests() -> None:
    """Drop the cached singleton — tests use this between cases."""
    global _storage
    _storage = None


def build_archive_key(tenant_id: uuid.UUID, document_id: uuid.UUID, extension: str) -> str:
    """Construct the per-document archive key.

    Keys are namespaced by tenant so an operator listing the container can
    immediately see ownership, and so cross-tenant key collisions are
    impossible.
    """
    ext = extension.lstrip(".") or "bin"
    return f"{tenant_id}/{document_id}.{ext}"


__all__ = [
    "AzureBlobBackend",
    "BlobStorage",
    "LocalDiskBackend",
    "build_archive_key",
    "get_storage",
    "reset_storage_for_tests",
]
