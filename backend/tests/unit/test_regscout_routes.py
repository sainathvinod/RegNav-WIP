"""Route smoke tests for the RegScout API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import DiscoveredDocument, Job, RegulatorySource
from app.main import create_app
from tests.unit._fake_db import FakeSession

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


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


async def test_list_sources_returns_empty_initially(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get(
        "/api/v1/regscout/sources",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_create_source_persists_row(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    response = await client.post(
        "/api/v1/regscout/sources",
        headers={"Authorization": "Bearer dev-bypass"},
        json={
            "name": "California DOI Bulletins",
            "url": "https://www.insurance.ca.gov/bulletins/",
            "source_type": "state_dept",
            "state_code": "CA",
        },
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["name"] == "California DOI Bulletins"
    assert payload["stateCode"] == "CA"
    assert payload["enabled"] is True
    assert payload["discoveredDocCount"] == 0
    assert uuid.UUID(payload["id"])
    assert len(fake_db.store.get(RegulatorySource, {})) == 1


async def test_start_discovery_enqueues_job(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    # Seed one source so the request is meaningful
    source = RegulatorySource(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        name="WI OCI",
        url="https://oci.wi.gov/Pages/Regulation/Bulletins.aspx",
        source_type="state_dept",
        state_code="WI",
        enabled=True,
    )
    source.created_at = datetime.now(UTC)
    source.updated_at = datetime.now(UTC)
    fake_db.add(source)

    response = await client.post(
        "/api/v1/regscout/discover",
        headers={"Authorization": "Bearer dev-bypass"},
        json={"all": True},
    )
    assert response.status_code == 202, response.text
    body = response.json()
    assert uuid.UUID(body["jobId"])
    # A Job row was inserted
    jobs = list(fake_db.store.get(Job, {}).values())
    assert len(jobs) == 1
    assert jobs[0].type == "regscout.discover"
    assert jobs[0].status == "queued"


async def test_start_discovery_rejects_empty_request(
    client: httpx.AsyncClient,
) -> None:
    response = await client.post(
        "/api/v1/regscout/discover",
        headers={"Authorization": "Bearer dev-bypass"},
        json={},
    )
    assert response.status_code == 400


async def test_list_discovered_documents_filters_by_status(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    source_id = uuid.uuid4()
    fake_db.add(
        RegulatorySource(
            id=source_id,
            tenant_id=TENANT_ID,
            name="X",
            url="https://x.gov",
            source_type="state_dept",
            enabled=True,
        )
    )

    fake_db.add(
        DiscoveredDocument(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            source_id=source_id,
            url="https://x.gov/a.pdf",
            title="A",
            status="pending",
        )
    )
    fake_db.add(
        DiscoveredDocument(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            source_id=source_id,
            url="https://x.gov/b.pdf",
            title="B",
            status="ingested",
        )
    )

    response = await client.get(
        "/api/v1/regscout/documents",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 200
    assert len(response.json()) == 2


async def test_queue_ingest_creates_job_for_discovered_doc(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    source_id = uuid.uuid4()
    fake_db.add(
        RegulatorySource(
            id=source_id,
            tenant_id=TENANT_ID,
            name="X",
            url="https://x.gov",
            source_type="state_dept",
        )
    )
    discovered_id = uuid.uuid4()
    fake_db.add(
        DiscoveredDocument(
            id=discovered_id,
            tenant_id=TENANT_ID,
            source_id=source_id,
            url="https://x.gov/a.pdf",
            title="A",
            status="pending",
        )
    )

    response = await client.post(
        f"/api/v1/regscout/documents/{discovered_id}/ingest",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 202, response.text
    payload = response.json()
    assert uuid.UUID(payload["jobId"])
    jobs = list(fake_db.store.get(Job, {}).values())
    assert len(jobs) == 1
    assert jobs[0].type == "regingest.ingest_url"
    assert jobs[0].input["discovered_document_id"] == str(discovered_id)
