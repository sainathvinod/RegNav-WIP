"""Route smoke tests for the Audit API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import AuditLog
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


def _make_entry(action: str, resource_type: str = "rule") -> AuditLog:
    e = AuditLog(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        user_id=uuid.uuid4(),
        action=action,
        resource_type=resource_type,
        resource_id=uuid.uuid4(),
    )
    e.created_at = datetime.now(UTC)
    return e


async def test_audit_list_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/audit", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_audit_list_returns_entries(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    fake_db.add(_make_entry("rule.approve"))
    fake_db.add(_make_entry("rule.reject"))
    fake_db.add(_make_entry("org.create", resource_type="tenant"))

    resp = await client.get("/api/v1/audit", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 3


async def test_audit_writes_recorded_on_rule_approve(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    from app.db.models import Rule

    rule = Rule(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        rule_code="WC-001",
        rule_type="compliance",
        title="Test rule",
        text="Test text",
        status="draft",
    )
    rule.created_at = datetime.now(UTC)
    rule.updated_at = datetime.now(UTC)
    fake_db.add(rule)

    resp = await client.post(f"/api/v1/ruleminer/rules/{rule.id}/approve", headers=AUTH)
    assert resp.status_code == 200

    # An audit row should have been added with action='rule.approve'
    audit_rows = list(fake_db.store.get(AuditLog, {}).values())
    assert any(r.action == "rule.approve" for r in audit_rows)
