"""Route smoke tests for the RuleMiner API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Document, Rule
from app.main import create_app
from tests.unit._fake_db import FakeSession

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
AUTH = {"Authorization": "Bearer dev-bypass"}


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


def _make_rule(
    rule_id: uuid.UUID | None = None,
    status: str = "draft",
    rule_code: str = "WC-001",
) -> Rule:
    r = Rule(
        id=rule_id or uuid.uuid4(),
        tenant_id=TENANT_ID,
        rule_code=rule_code,
        rule_type="compliance",
        title="Test Rule",
        text="All WC policies must include coverage for occupational disease.",
        status=status,
        confidence_score=0.9,
    )
    r.created_at = datetime.now(UTC)
    r.updated_at = datetime.now(UTC)
    return r


# ---------------------------------------------------------------------------
# Tests — list + get
# ---------------------------------------------------------------------------


async def test_list_rules_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/ruleminer/rules", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_rules_returns_seeded_rows(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_rule(status="approved"))
    fake_db.add(_make_rule(rule_code="WC-002"))
    resp = await client.get("/api/v1/ruleminer/rules", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_get_rule_by_id(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = _make_rule()
    fake_db.add(rule)
    resp = await client.get(f"/api/v1/ruleminer/rules/{rule.id}", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["ruleCode"] == "WC-001"


async def test_get_rule_not_found(client: httpx.AsyncClient) -> None:
    resp = await client.get(
        f"/api/v1/ruleminer/rules/{uuid.uuid4()}", headers=AUTH
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests — approval workflow
# ---------------------------------------------------------------------------


async def test_approve_draft_rule(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = _make_rule(status="draft")
    fake_db.add(rule)
    resp = await client.post(
        f"/api/v1/ruleminer/rules/{rule.id}/approve", headers=AUTH
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


async def test_reject_draft_rule(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = _make_rule(status="draft")
    fake_db.add(rule)
    resp = await client.post(
        f"/api/v1/ruleminer/rules/{rule.id}/reject", headers=AUTH
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


async def test_approve_already_approved_is_idempotent(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = _make_rule(status="approved")
    fake_db.add(rule)
    resp = await client.post(
        f"/api/v1/ruleminer/rules/{rule.id}/approve", headers=AUTH
    )
    assert resp.status_code == 200


async def test_delete_rule(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = _make_rule()
    fake_db.add(rule)
    resp = await client.delete(f"/api/v1/ruleminer/rules/{rule.id}", headers=AUTH)
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Tests — extract endpoint
# ---------------------------------------------------------------------------


async def test_extract_requires_indexed_document(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    doc = Document(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        title="Test Doc",
        source_type="text",
        status="processing",  # not indexed
        chunk_count=0,
    )
    doc.created_at = datetime.now(UTC)
    doc.updated_at = datetime.now(UTC)
    fake_db.add(doc)

    resp = await client.post(
        "/api/v1/ruleminer/extract",
        headers=AUTH,
        json={"documentId": str(doc.id)},
    )
    assert resp.status_code == 422


async def test_extract_enqueues_job_for_indexed_document(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    from app.db.models import Job

    doc = Document(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        title="Indexed Doc",
        source_type="text",
        status="indexed",
        chunk_count=5,
    )
    doc.created_at = datetime.now(UTC)
    doc.updated_at = datetime.now(UTC)
    fake_db.add(doc)

    resp = await client.post(
        "/api/v1/ruleminer/extract",
        headers=AUTH,
        json={"documentId": str(doc.id)},
    )
    assert resp.status_code == 202, resp.text
    payload = resp.json()
    assert "jobId" in payload
    # Verify a job row was added
    jobs = list(fake_db.store.get(Job, {}).values())
    assert len(jobs) == 1
    assert jobs[0].type == "ruleminer.extract"
