"""Route smoke tests for the Analytics API."""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx
import pytest

from app.db.engine import get_db
from app.db.models import Document, Rule, ValidationRun
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


async def test_summary_with_no_data_returns_zeros(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/analytics/summary", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    assert body["documents"] == 0
    assert body["rules"]["total"] == 0
    assert body["validations"]["total"] == 0
    assert body["complianceScore"] == 100.0


async def test_summary_counts_documents(client: httpx.AsyncClient, fake_db: FakeSession) -> None:
    for _ in range(3):
        doc = Document(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            title="Doc",
            source_type="text",
            status="indexed",
            chunk_count=1,
        )
        doc.created_at = datetime.now(UTC)
        doc.updated_at = datetime.now(UTC)
        fake_db.add(doc)

    resp = await client.get("/api/v1/analytics/summary", headers=AUTH)
    assert resp.status_code == 200
    assert resp.json()["documents"] == 3


async def test_summary_counts_rules_by_status(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    for s in ("draft", "draft", "approved", "rejected"):
        r = Rule(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            rule_code=f"R-{uuid.uuid4().hex[:4]}",
            rule_type="general",
            title="Rule",
            text="Rule text",
            status=s,
        )
        r.created_at = datetime.now(UTC)
        r.updated_at = datetime.now(UTC)
        fake_db.add(r)

    resp = await client.get("/api/v1/analytics/summary", headers=AUTH)
    body = resp.json()
    assert body["rules"]["total"] == 4
    assert body["rules"]["draft"] == 2
    assert body["rules"]["approved"] == 1
    assert body["rules"]["rejected"] == 1


async def test_summary_counts_validation_runs(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    for _ in range(2):
        run = ValidationRun(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            filename="test.wcpols",
            file_type="wcpols",
            status="completed",
            total_rules_checked=3,
            violations_found=0,
            warnings_found=0,
        )
        run.created_at = datetime.now(UTC)
        run.updated_at = datetime.now(UTC)
        fake_db.add(run)

    resp = await client.get("/api/v1/analytics/summary", headers=AUTH)
    assert resp.json()["validations"]["total"] == 2
