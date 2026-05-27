"""Route smoke tests for the Profiles API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import DiscoveryProfile
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


_AUTH = {"Authorization": "Bearer dev-bypass"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_list_profiles_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/profiles", headers=_AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_profile_round_trip(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    payload = {
        "name": "TX WC discovery",
        "description": "Workers comp filings for Texas",
        "status": "draft",
        "configuration": {"states": ["TX"], "linesOfBusiness": "workers_comp"},
        "sources": [{"name": "TDI", "url": "https://www.tdi.texas.gov"}],
        "metadata": {"totalSources": 1},
        "tags": ["tx", "wc"],
    }
    create = await client.post("/api/v1/profiles", headers=_AUTH, json=payload)
    assert create.status_code == 201, create.text
    body = create.json()
    assert uuid.UUID(body["id"])
    assert body["name"] == "TX WC discovery"
    assert body["configuration"]["states"] == ["TX"]
    assert body["profileMetadata"]["totalSources"] == 1
    assert body["tags"] == ["tx", "wc"]

    # The fake-db keeps an actual ORM row
    rows = list(fake_db.store.get(DiscoveryProfile, {}).values())
    assert len(rows) == 1
    assert rows[0].name == "TX WC discovery"


async def test_update_profile_changes_status_and_metadata(
    client: httpx.AsyncClient,
) -> None:
    created = await client.post(
        "/api/v1/profiles",
        headers=_AUTH,
        json={"name": "Draft profile"},
    )
    pid = created.json()["id"]

    updated = await client.patch(
        f"/api/v1/profiles/{pid}",
        headers=_AUTH,
        json={"status": "finalized", "metadata": {"totalSources": 3}},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "finalized"
    assert updated.json()["profileMetadata"]["totalSources"] == 3


async def test_delete_profile_returns_204_and_hides_from_list(
    client: httpx.AsyncClient,
) -> None:
    created = await client.post("/api/v1/profiles", headers=_AUTH, json={"name": "Temp"})
    pid = created.json()["id"]

    delete = await client.delete(f"/api/v1/profiles/{pid}", headers=_AUTH)
    assert delete.status_code == 204

    listing = await client.get("/api/v1/profiles", headers=_AUTH)
    assert listing.status_code == 200
    assert listing.json() == []

    # Subsequent fetch is a 404 (soft-deleted)
    refetch = await client.get(f"/api/v1/profiles/{pid}", headers=_AUTH)
    assert refetch.status_code == 404


async def test_get_unknown_profile_is_404(client: httpx.AsyncClient) -> None:
    resp = await client.get(f"/api/v1/profiles/{uuid.uuid4()}", headers=_AUTH)
    assert resp.status_code == 404
