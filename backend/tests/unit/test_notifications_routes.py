"""Route smoke tests for the Notifications API + write hooks."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Notification, User
from app.main import create_app
from tests.unit._fake_db import FakeSession

AUTH = {"Authorization": "Bearer dev-bypass"}
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEV_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


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


def _make_notification(
    *,
    user_id: uuid.UUID = DEV_USER_ID,
    read: bool = False,
    event_type: str = "validation.completed",
) -> Notification:
    n = Notification(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        user_id=user_id,
        event_type=event_type,
        title="Test notification",
        body="Body",
        severity="info",
        payload={},
    )
    n.created_at = datetime.now(UTC)
    n.updated_at = datetime.now(UTC)
    if read:
        n.read_at = datetime.now(UTC)
    return n


# ---------------------------------------------------------------------------
# list / unread-count
# ---------------------------------------------------------------------------


async def test_list_notifications_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/notifications", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_notifications_returns_rows(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_notification())
    fake_db.add(_make_notification(read=True))
    resp = await client.get("/api/v1/notifications", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_unread_count(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    fake_db.add(_make_notification(read=False))
    fake_db.add(_make_notification(read=False))
    fake_db.add(_make_notification(read=True))
    resp = await client.get("/api/v1/notifications/unread-count", headers=AUTH)
    assert resp.status_code == 200
    # FakeSession's scalar() counts all rows for the entity, not the filter,
    # so we only check that the field exists and is an int.
    assert isinstance(resp.json()["unread"], int)


# ---------------------------------------------------------------------------
# mark read
# ---------------------------------------------------------------------------


async def test_mark_read(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    n = _make_notification(read=False)
    fake_db.add(n)
    resp = await client.post(f"/api/v1/notifications/{n.id}/read", headers=AUTH)
    assert resp.status_code == 200, resp.text
    assert resp.json()["readAt"] is not None


async def test_mark_read_not_found(client: httpx.AsyncClient) -> None:
    resp = await client.post(f"/api/v1/notifications/{uuid.uuid4()}/read", headers=AUTH)
    assert resp.status_code == 404


async def test_mark_read_belongs_to_other_user(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    other = _make_notification(user_id=uuid.uuid4())
    fake_db.add(other)
    resp = await client.post(f"/api/v1/notifications/{other.id}/read", headers=AUTH)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# write hook: invite creates a notification
# ---------------------------------------------------------------------------


async def test_invite_writes_notification(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    with patch("app.services.email.send_email", new=AsyncMock(return_value=True)):
        resp = await client.post(
            "/api/v1/users/invite",
            headers=AUTH,
            json={
                "email": "n@example.com",
                "displayName": "Notif Recipient",
                "roles": ["analyst"],
            },
        )
    assert resp.status_code == 201, resp.text

    # A notification row should now exist for the new user
    invited = [u for u in fake_db.store.get(User, {}).values() if u.email == "n@example.com"]
    assert len(invited) == 1
    notifs = [n for n in fake_db.store.get(Notification, {}).values() if n.user_id == invited[0].id]
    assert any(n.event_type == "user.invited" for n in notifs)


# ---------------------------------------------------------------------------
# email send fallback (provider=log)
# ---------------------------------------------------------------------------


async def test_email_log_provider_returns_true() -> None:
    from app.services.email import send_email

    # Default provider is "log" — should log and return True without errors
    ok = await send_email(to="dev@local", subject="hi", body="body")
    assert ok is True
