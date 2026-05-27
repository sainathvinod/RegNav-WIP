"""Unit tests for GET /api/v1/health/llm.

Both LLM providers are stubbed so the tests run offline without real
API keys. We verify the response schema and correct propagation of
success / failure from each provider.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.db.engine import get_db
from app.main import create_app
from tests.unit._fake_db import FakeSession

_AUTH = {"Authorization": "Bearer dev-bypass"}


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
# Helpers — mock async generators
# ---------------------------------------------------------------------------


async def _ok_stream(*_args, **_kwargs):
    yield {"type": "token", "text": "OK"}
    yield {"type": "done", "usage": {"input_tokens": 5, "output_tokens": 1}}


async def _error_stream(*_args, **_kwargs):
    yield {"type": "error", "message": "invalid x-api-key"}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_llm_health_both_pass(client: httpx.AsyncClient) -> None:
    mock_embed = AsyncMock(return_value=[0.1] * 1536)

    with (
        patch("app.api.v1.health.stream_chat", side_effect=_ok_stream),
        patch("app.api.v1.health.EmbeddingClient") as MockClient,
    ):
        MockClient.return_value.embed_single = mock_embed
        resp = await client.get("/api/v1/health/llm", headers=_AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert body["overall"] is True
    assert body["providers"]["anthropic"]["ok"] is True
    assert body["providers"]["openai"]["ok"] is True
    assert body["providers"]["openai"]["dimensions"] == 1536


async def test_llm_health_anthropic_fails(client: httpx.AsyncClient) -> None:
    mock_embed = AsyncMock(return_value=[0.1] * 1536)

    with (
        patch("app.api.v1.health.stream_chat", side_effect=_error_stream),
        patch("app.api.v1.health.EmbeddingClient") as MockClient,
    ):
        MockClient.return_value.embed_single = mock_embed
        resp = await client.get("/api/v1/health/llm", headers=_AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert body["overall"] is False
    assert body["providers"]["anthropic"]["ok"] is False
    assert "error" in body["providers"]["anthropic"]
    assert body["providers"]["openai"]["ok"] is True


async def test_llm_health_openai_fails(client: httpx.AsyncClient) -> None:
    with (
        patch("app.api.v1.health.stream_chat", side_effect=_ok_stream),
        patch("app.api.v1.health.EmbeddingClient") as MockClient,
    ):
        MockClient.return_value.embed_single = AsyncMock(side_effect=Exception("Unauthorized"))
        resp = await client.get("/api/v1/health/llm", headers=_AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert body["overall"] is False
    assert body["providers"]["anthropic"]["ok"] is True
    assert body["providers"]["openai"]["ok"] is False
    assert body["providers"]["openai"]["error"] == "Unauthorized"


async def test_llm_health_dev_bypass_allowed(client: httpx.AsyncClient) -> None:
    # Dev mode: no header → dev-bypass is accepted, no 401
    with (
        patch("app.api.v1.health.stream_chat", side_effect=_ok_stream),
        patch("app.api.v1.health.EmbeddingClient") as MockClient,
    ):
        MockClient.return_value.embed_single = AsyncMock(return_value=[0.1] * 1536)
        resp = await client.get("/api/v1/health/llm")
    assert resp.status_code == 200
