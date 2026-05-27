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
