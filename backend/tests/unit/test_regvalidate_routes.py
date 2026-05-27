"""Route smoke tests for the RegValidate API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Rule, ValidationRun
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


def _make_run(run_id: uuid.UUID | None = None, status: str = "completed") -> ValidationRun:
    r = ValidationRun(
        id=run_id or uuid.uuid4(),
        tenant_id=TENANT_ID,
        filename="test.wcpols",
        file_type="wcpols",
        status=status,
        total_rules_checked=3,
        violations_found=1,
        warnings_found=0,
    )
    r.created_at = datetime.now(UTC)
    r.updated_at = datetime.now(UTC)
    return r


# ---------------------------------------------------------------------------
# Tests — list + get runs
# ---------------------------------------------------------------------------


async def test_list_runs_empty(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/regvalidate/runs", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_runs_returns_seeded_rows(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    fake_db.add(_make_run())
    fake_db.add(_make_run())
    resp = await client.get("/api/v1/regvalidate/runs", headers=AUTH)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_get_run_by_id(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    run = _make_run()
    fake_db.add(run)
    resp = await client.get(f"/api/v1/regvalidate/runs/{run.id}", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["filename"] == "test.wcpols"


async def test_get_run_not_found(client: httpx.AsyncClient) -> None:
    resp = await client.get(f"/api/v1/regvalidate/runs/{uuid.uuid4()}", headers=AUTH)
    assert resp.status_code == 404


async def test_delete_run(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    run = _make_run()
    fake_db.add(run)
    # delete requires db.delete() — FakeSession handles via close
    with patch.object(fake_db, "delete", new=AsyncMock()):
        resp = await client.delete(f"/api/v1/regvalidate/runs/{run.id}", headers=AUTH)
    assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Tests — validation (mocking the LLM call)
# ---------------------------------------------------------------------------


async def test_validate_with_no_approved_rules_returns_clean(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    """When no approved rules exist, validation completes with 0 checks."""
    resp = await client.post(
        "/api/v1/regvalidate/validate",
        headers=AUTH,
        json={
            "filename": "policy.wcpols",
            "fileType": "wcpols",
            "content": "POLICY_NO,STATE,CLASS_CODE\n001,TX,8810",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "completed"
    assert body["totalRulesChecked"] == 0
    assert body["violationsFound"] == 0


async def test_validate_with_approved_rules_calls_llm(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    rule = Rule(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        rule_code="WC-STATE-001",
        rule_type="compliance",
        title="State Code Required",
        text="All WCPOLS records must contain a valid 2-letter state code.",
        status="approved",
        confidence_score=0.95,
    )
    rule.created_at = datetime.now(UTC)
    rule.updated_at = datetime.now(UTC)
    fake_db.add(rule)

    mock_findings = [
        {
            "rule_code": "WC-STATE-001",
            "severity": "error",
            "field_name": "STATE",
            "field_value": "XX",
            "message": "Invalid state code 'XX'",
            "line_number": 2,
            "suggestion": "Use a valid 2-letter USPS state abbreviation.",
        }
    ]

    with patch(
        "app.services.regvalidate._call_validation_api",
        new=AsyncMock(return_value=mock_findings),
    ):
        resp = await client.post(
            "/api/v1/regvalidate/validate",
            headers=AUTH,
            json={
                "filename": "bad.wcpols",
                "fileType": "wcpols",
                "content": "POLICY_NO,STATE\n001,XX",
            },
        )

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "completed"
    assert body["violationsFound"] == 1
