"""Route smoke tests for the Configuration API."""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import pytest

from app.db.engine import get_db
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


async def test_get_config_returns_all_keys(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/config", headers=AUTH)
    assert resp.status_code == 200
    body = resp.json()
    keys = {e["key"] for e in body["entries"]}
    assert "chat_model" in keys
    assert "rag_top_k" in keys
    assert "default_state_code" in keys


async def test_get_config_defaults_not_overridden(client: httpx.AsyncClient) -> None:
    resp = await client.get("/api/v1/config", headers=AUTH)
    for entry in resp.json()["entries"]:
        assert entry["isOverridden"] is False


async def test_update_config_persists_override(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    resp = await client.patch(
        "/api/v1/config",
        headers=AUTH,
        json={"updates": {"default_state_code": "TX", "rag_top_k": "10"}},
    )
    assert resp.status_code == 200
    entries = {e["key"]: e for e in resp.json()["entries"]}
    assert entries["default_state_code"]["value"] == "TX"
    assert entries["default_state_code"]["isOverridden"] is True
    assert entries["rag_top_k"]["value"] == "10"


async def test_update_config_rejects_unknown_keys(client: httpx.AsyncClient) -> None:
    resp = await client.patch(
        "/api/v1/config",
        headers=AUTH,
        json={"updates": {"hacker_key": "pwned"}},
    )
    assert resp.status_code == 422


async def test_reset_config_key(
    client: httpx.AsyncClient, fake_db: FakeSession
) -> None:
    resp = await client.delete("/api/v1/config/default_state_code", headers=AUTH)
    assert resp.status_code == 204
