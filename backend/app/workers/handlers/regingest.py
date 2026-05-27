"""Handlers for the RegIngest job types."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import DiscoveredDocument, Job
from app.services import ingest as ingest_service
from app.services import regingest as regingest_service
from app.services.blob_storage import get_storage
from app.workers.runner import ProgressReporter

logger = get_logger(__name__)


async def handle_regingest_ingest_url(
    db: AsyncSession,
    job: Job,
    progress: ProgressReporter,
) -> dict[str, Any]:
    """Ingest a single URL.

    Input may carry either ``discovered_document_id`` (preferred — links
    the resulting ``Document`` back to the discovered row) or a raw
    ``url`` plus optional metadata.
    """
    payload = job.input or {}

    discovered: DiscoveredDocument | None = None
    if dd_id := payload.get("discovered_document_id"):
        discovered = await db.get(DiscoveredDocument, uuid.UUID(str(dd_id)))
        if discovered is None:
            raise ValueError(f"DiscoveredDocument {dd_id} not found")
        if discovered.tenant_id != job.tenant_id:
            raise ValueError("DiscoveredDocument belongs to a different tenant")
        url = discovered.url
        title = discovered.title
        state_code = payload.get("state_code") or None
        lob = payload.get("lob") or None
    else:
        url = payload.get("url")
        if not url:
            raise ValueError("Either discovered_document_id or url is required")
        title = payload.get("title")
        state_code = payload.get("state_code")
        lob = payload.get("lob")

    await progress.update(10, f"Fetching {url}")

    try:
        document = await regingest_service.ingest_from_url(
            db,
            tenant_id=job.tenant_id,
            source_url=url,
            title=title,
            state_code=state_code,
            lob=lob,
        )
        await progress.update(80, "Document indexed")
        if discovered is not None:
            discovered.status = "ingested"
            discovered.ingested_document_id = document.id
            discovered.updated_at = datetime.now(UTC)
        await db.commit()
        await progress.update(100, "Done")
        return {
            "document_id": str(document.id),
            "title": document.title,
            "chunk_count": document.chunk_count,
            "status": document.status,
        }
    except NotImplementedError as exc:
        if discovered is not None:
            discovered.status = "skipped"
            await db.commit()
        raise ValueError(str(exc)) from exc
    except Exception:
        await db.rollback()
        if discovered is not None:
            discovered_again = await db.get(DiscoveredDocument, discovered.id)
            if discovered_again is not None:
                discovered_again.status = "failed"
                await db.commit()
        raise


async def handle_regingest_ingest_text(
    db: AsyncSession,
    job: Job,
    progress: ProgressReporter,
) -> dict[str, Any]:
    """Ingest raw text into the RAG store."""
    payload = job.input or {}
    title = payload.get("title")
    body = payload.get("text")
    if not title or not body:
        raise ValueError("Both 'title' and 'text' are required")

    await progress.update(10, "Embedding text")
    document = await ingest_service.ingest_text(
        db=db,
        tenant_id=job.tenant_id,
        title=title,
        text=body,
        source_type="text",
        state_code=payload.get("state_code"),
        lob=payload.get("lob"),
    )
    await db.commit()
    await progress.update(100, "Done")
    return {
        "document_id": str(document.id),
        "title": document.title,
        "chunk_count": document.chunk_count,
        "status": document.status,
    }


async def handle_regingest_ingest_file(
    db: AsyncSession,
    job: Job,
    progress: ProgressReporter,
) -> dict[str, Any]:
    """Ingest an uploaded file (currently PDF only).

    The API endpoint staged the upload in blob storage under
    ``_uploads/{tenant}/{uuid}.pdf``; we pull those bytes back, run them
    through the Docling pipeline, and finally delete the staging blob.
    """
    payload = job.input or {}
    upload_key = payload.get("upload_key")
    filename = payload.get("filename") or "upload.pdf"
    if not upload_key:
        raise ValueError("'upload_key' is required")

    storage = get_storage()
    await progress.update(10, f"Loading {filename}")
    try:
        pdf_bytes = await storage.get(upload_key)
    except FileNotFoundError as exc:
        raise ValueError(f"Uploaded file not found at {upload_key}") from exc

    await progress.update(30, "Extracting text with Docling")
    document = await regingest_service.ingest_pdf_bytes(
        db,
        tenant_id=job.tenant_id,
        filename=filename,
        pdf_bytes=pdf_bytes,
        title=payload.get("title"),
        state_code=payload.get("state_code"),
        lob=payload.get("lob"),
    )
    await db.commit()
    await progress.update(95, "Cleaning up staging blob")

    # Best-effort delete of the staging upload. The permanent archive was
    # written by ingest_text with a different key.
    try:
        await storage.delete(upload_key)
    except Exception as exc:
        logger.warning("upload_staging_cleanup_failed", key=upload_key, error=str(exc))

    await progress.update(100, "Done")
    return {
        "document_id": str(document.id),
        "title": document.title,
        "chunk_count": document.chunk_count,
        "status": document.status,
    }
