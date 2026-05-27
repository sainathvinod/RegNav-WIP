"""Route smoke tests for the RegIngest API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Job
from app.main import create_app
from tests.unit._fake_db import FakeSession


@pytest.fixture
def fake_db() -> FakeSession:
    return FakeSession()


@pytest.fixture
def app(fake_db: FakeSession):  # type: ignore[no-untyped-def]
    application = create_app()

    async def override_get_db() -> AsyncIterator[FakeSession]:
        yield fake_db

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_ingest_from_text_enqueues_job(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    response = await client.post(
        "/api/v1/regingest/from-text",
        headers={"Authorization": "Bearer dev-bypass"},
        json={
            "title": "TX WC Notice 2026-12",
            "text": "All carriers shall file quarterly...",
            "state_code": "TX",
            "lob": "workers_comp",
        },
    )
    assert response.status_code == 202, response.text
    body = response.json()
    assert uuid.UUID(body["jobId"])
    jobs = list(fake_db.store.get(Job, {}).values())
    assert len(jobs) == 1
    job = jobs[0]
    assert job.type == "regingest.ingest_text"
    assert job.input["title"] == "TX WC Notice 2026-12"
    assert job.input["state_code"] == "TX"


async def test_ingest_from_url_enqueues_job(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    response = await client.post(
        "/api/v1/regingest/from-url",
        headers={"Authorization": "Bearer dev-bypass"},
        json={
            "url": "https://example.gov/bulletin.html",
            "title": "Bulletin 1",
            "state_code": "CA",
        },
    )
    assert response.status_code == 202, response.text
    jobs = list(fake_db.store.get(Job, {}).values())
    assert len(jobs) == 1
    assert jobs[0].type == "regingest.ingest_url"
    assert jobs[0].input["url"] == "https://example.gov/bulletin.html"


async def test_ingest_from_text_rejects_empty_body(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/regingest/from-text",
        headers={"Authorization": "Bearer dev-bypass"},
        json={"title": "x", "text": ""},
    )
    assert response.status_code == 422


async def test_list_documents_returns_empty_initially(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get(
        "/api/v1/regingest/documents",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_ingest_from_file_uploads_pdf_and_enqueues_job(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
    tmp_path,
) -> None:
    """Uploading a PDF stages it in blob storage and enqueues an ingest job."""
    from app.services import blob_storage

    blob_storage.reset_storage_for_tests()
    # Point local storage at the test tmp dir so we don't pollute /tmp.
    original_root = blob_storage.settings.storage_local_dir
    blob_storage.settings.storage_local_dir = str(tmp_path)

    try:
        # Minimal valid PDF — 4 bytes header + EOF. pypdf doesn't need it
        # to be content-valid because the worker is what runs extraction.
        pdf_bytes = b"%PDF-1.4\n%%EOF\n"
        response = await client.post(
            "/api/v1/regingest/from-file",
            headers={"Authorization": "Bearer dev-bypass"},
            files={"file": ("bulletin.pdf", pdf_bytes, "application/pdf")},
            data={"title": "TX Bulletin 2026-12", "state_code": "TX"},
        )
        assert response.status_code == 202, response.text
        body = response.json()
        assert uuid.UUID(body["jobId"])

        jobs = list(fake_db.store.get(Job, {}).values())
        assert len(jobs) == 1
        job = jobs[0]
        assert job.type == "regingest.ingest_file"
        assert job.input["filename"] == "bulletin.pdf"
        assert job.input["title"] == "TX Bulletin 2026-12"
        assert job.input["upload_key"].startswith("_uploads/")
        assert job.input["upload_key"].endswith(".pdf")

        # The bytes should be on disk under the staging key.
        staged = await blob_storage.get_storage().get(job.input["upload_key"])
        assert staged == pdf_bytes
    finally:
        blob_storage.settings.storage_local_dir = original_root
        blob_storage.reset_storage_for_tests()


async def test_ingest_from_file_rejects_non_pdf(client: httpx.AsyncClient) -> None:
    """Non-PDF uploads return 415 before touching storage."""
    response = await client.post(
        "/api/v1/regingest/from-file",
        headers={"Authorization": "Bearer dev-bypass"},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415


async def test_ingest_from_file_rejects_empty(client: httpx.AsyncClient) -> None:
    """An empty PDF is rejected with 400 (no job is queued)."""
    response = await client.post(
        "/api/v1/regingest/from-file",
        headers={"Authorization": "Bearer dev-bypass"},
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 400


async def test_archive_endpoint_returns_404_for_unknown_document(
    client: httpx.AsyncClient,
) -> None:
    """Asking for the archive of a non-existent document is a 404."""
    response = await client.get(
        f"/api/v1/regingest/documents/{uuid.uuid4()}/archive",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 404
