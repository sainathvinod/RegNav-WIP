"""Route smoke tests for the Organizations API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Tenant
from app.main import create_app
from tests.unit._fake_db import FakeSession

AUTH = {"Authorization": "Bearer dev-bypass"}


@pytest.fixture
def fake_db() -> FakeSession:
    return FakeSession()


@pytest.fixture
def app(fake_db: FakeSession):  # type: ignore[no-untyped-def]
    application = create_app()

    async def override() -> AsyncIterator[FakeSession]:
        yield fake_db

    application.dependency_overrides[get_db] = override
    return application


@pytest.fixture
async def client(app) -> AsyncIterator[httpx.AsyncClient]:  # type: ignore[no-untyped-def]
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


def _make_tenant(name: str = "Acme Corp", slug: str = "acme") -> Tenant:
    t = Tenant(id=uuid.uuid4(), name=name, slug=slug, status="active")
    t.created_at = datetime.now(UTC)
    t.updated_at = datetime.now(UTC)
    return t


async def test_list_orgs_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/organizations", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_orgs_returns_tenants(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_tenant("Acme Corp", "acme"))
    fake_db.add(_make_tenant("Beta Inc", "beta"))
    resp = await client.get("/api/v1/organizations", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_create_org(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    resp = await client.post(
        "/api/v1/organizations",
        headers=AUTH,
        json={"name": "Gamma LLC", "slug": "gamma-llc"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["name"] == "Gamma LLC"
    assert body["slug"] == "gamma-llc"


async def test_create_org_duplicate_slug_rejected(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_tenant("Acme Corp", "acme"))
    resp = await client.post(
        "/api/v1/organizations",
        headers=AUTH,
        json={"name": "Another Acme", "slug": "acme"},
    )
    assert resp.status_code == 409


async def test_update_org(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    tenant = _make_tenant()
    fake_db.add(tenant)
    resp = await client.patch(
        f"/api/v1/organizations/{tenant.id}",
        headers=AUTH,
        json={"name": "Acme Corp Renamed"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Acme Corp Renamed"


async def test_get_org_not_found(client: httpx.AsyncClient) -> None:
    resp = await client.patch(
        f"/api/v1/organizations/{uuid.uuid4()}",
        headers=AUTH,
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404


async def test_delete_org(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    tenant = _make_tenant()
    fake_db.add(tenant)
    resp = await client.delete(f"/api/v1/organizations/{tenant.id}", headers=AUTH)
    assert resp.status_code == 204
