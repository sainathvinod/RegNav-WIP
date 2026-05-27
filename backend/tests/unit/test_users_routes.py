"""Route smoke tests for the user management API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import User
from app.main import create_app
from tests.unit._fake_db import FakeSession

AUTH = {"Authorization": "Bearer dev-bypass"}
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


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


def _make_user(email: str = "u@example.com", display: str = "User") -> User:
    u = User(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        email=email,
        external_id=f"pending-{uuid.uuid4().hex[:12]}",
        display_name=display,
        status="invited",
    )
    u.created_at = datetime.now(UTC)
    u.updated_at = datetime.now(UTC)
    return u


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------


async def test_me_returns_current_user(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/users/me", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["tenantId"] == str(TENANT_ID)
    assert "platform_admin" in body["roles"]


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------


async def test_list_users_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/users", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_users_returns_seeded_rows(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_user("a@example.com"))
    fake_db.add(_make_user("b@example.com"))
    resp = await client.get("/api/v1/users", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# invite
# ---------------------------------------------------------------------------


async def test_invite_user(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    resp = await client.post(
        "/api/v1/users/invite",
        headers=AUTH,
        json={"email": "new@example.com", "displayName": "New User", "roles": ["analyst"]},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == "new@example.com"
    assert body["status"] == "invited"
    assert "analyst" in body["roles"]


async def test_invite_user_duplicate_email_rejected(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_user("dup@example.com"))
    resp = await client.post(
        "/api/v1/users/invite",
        headers=AUTH,
        json={"email": "dup@example.com", "displayName": "Dup", "roles": ["analyst"]},
    )
    assert resp.status_code == 409


async def test_invite_user_unknown_role_rejected(client: httpx.AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/users/invite",
        headers=AUTH,
        json={"email": "x@example.com", "displayName": "X", "roles": ["god_mode"]},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# update / delete
# ---------------------------------------------------------------------------


async def test_update_user(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    u = _make_user()
    fake_db.add(u)
    resp = await client.patch(
        f"/api/v1/users/{u.id}",
        headers=AUTH,
        json={"displayName": "Renamed", "status": "active"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["displayName"] == "Renamed"
    assert body["status"] == "active"


async def test_delete_user(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    u = _make_user()
    fake_db.add(u)
    resp = await client.delete(f"/api/v1/users/{u.id}", headers=AUTH)
    assert resp.status_code == 204


async def test_delete_self_rejected(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    # Dev-bypass user id
    self_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    u = _make_user()
    u.id = self_id
    fake_db.add(u)
    resp = await client.delete(f"/api/v1/users/{self_id}", headers=AUTH)
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# role catalogue
# ---------------------------------------------------------------------------


async def test_available_roles(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/users/roles/available", headers=AUTH)
    assert resp.status_code == 200
    roles = resp.json()
    assert "analyst" in roles
    assert "tenant_owner" in roles
    assert "platform_admin" in roles


# ---------------------------------------------------------------------------
# role assign / revoke
# ---------------------------------------------------------------------------


async def test_assign_role(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    u = _make_user()
    fake_db.add(u)
    resp = await client.post(
        f"/api/v1/users/{u.id}/roles",
        headers=AUTH,
        json={"role": "compliance_lead"},
    )
    assert resp.status_code == 200, resp.text
    assert "compliance_lead" in resp.json()["roles"]


async def test_assign_unknown_role_rejected(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    u = _make_user()
    fake_db.add(u)
    resp = await client.post(
        f"/api/v1/users/{u.id}/roles",
        headers=AUTH,
        json={"role": "ceo"},
    )
    assert resp.status_code == 422
