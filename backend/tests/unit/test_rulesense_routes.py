"""Route-level smoke tests for the RuleSense API.

We monkey-patch the DB dependency and the ingest/chat services so these
tests run without a live Postgres or external LLM.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

import httpx
import pytest

from app.api.v1 import rulesense as rulesense_api
from app.db.engine import get_db
from app.db.models import ChatSession, Document
from app.main import create_app
from app.services import ingest as ingest_service
from app.services import rulesense as rulesense_service

# ---------------------------------------------------------------------------
# Fake async DB session — captures .add()s in an in-memory store keyed by type
# ---------------------------------------------------------------------------


class _FakeResult:
    def __init__(self, items: list[Any]) -> None:
        self._items = items

    def scalars(self) -> _FakeResult:
        return self

    def all(self) -> list[Any]:
        return list(self._items)


class FakeSession:
    """Minimal subset of AsyncSession used by the routes under test."""

    def __init__(self) -> None:
        self.store: dict[type, dict[uuid.UUID, Any]] = {}
        self.added: list[Any] = []
        self.committed = False

    # Query path -----------------------------------------------------------
    async def execute(self, stmt: Any, params: dict[str, Any] | None = None) -> _FakeResult:
        entity = self._guess_entity(stmt)
        if entity is None:
            return _FakeResult([])
        items = list(self.store.get(entity, {}).values())
        return _FakeResult(items)

    def _guess_entity(self, stmt: Any) -> type | None:
        for entity in self.store:
            if entity.__name__.lower() in str(stmt).lower():
                return entity
        return None

    # CRUD path ------------------------------------------------------------
    def add(self, instance: Any) -> None:
        # Server defaults (created_at/updated_at) don't fire without a real DB —
        # set them here so pydantic response models can validate.
        now = datetime.now(UTC)
        if hasattr(instance, "created_at") and getattr(instance, "created_at", None) is None:
            instance.created_at = now
        if hasattr(instance, "updated_at") and getattr(instance, "updated_at", None) is None:
            instance.updated_at = now
        self.added.append(instance)
        bucket = self.store.setdefault(type(instance), {})
        bucket[instance.id] = instance

    def add_all(self, instances: list[Any]) -> None:
        for inst in instances:
            self.add(inst)

    async def get(self, entity: type, identifier: uuid.UUID) -> Any:
        return self.store.get(entity, {}).get(identifier)

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        return None

    async def refresh(self, instance: Any) -> None:
        return None

    async def close(self) -> None:
        return None


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_db() -> FakeSession:
    return FakeSession()


@pytest.fixture
def app_with_fake_db(fake_db: FakeSession):  # type: ignore[no-untyped-def]
    app = create_app()

    async def override_get_db() -> AsyncIterator[FakeSession]:
        yield fake_db

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture
async def client(app_with_fake_db) -> AsyncIterator[httpx.AsyncClient]:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app_with_fake_db)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_list_sessions_returns_empty_initially(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/api/v1/rulesense/sessions",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_create_session_returns_201_with_id_and_title(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
) -> None:
    response = await client.post(
        "/api/v1/rulesense/sessions",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["title"] == "New chat"
    assert uuid.UUID(payload["id"])
    assert payload["messageCount"] == 0
    # Stored in fake DB
    assert len(fake_db.store.get(ChatSession, {})) == 1


async def test_list_documents_returns_empty_initially(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/api/v1/rulesense/documents",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 200
    assert response.json() == []


async def test_delete_unknown_session_returns_404(client: httpx.AsyncClient) -> None:
    missing = uuid.uuid4()
    response = await client.delete(
        f"/api/v1/rulesense/sessions/{missing}",
        headers={"Authorization": "Bearer dev-bypass"},
    )
    assert response.status_code == 404


async def test_create_document_uses_mocked_ingest(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_doc = Document(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        title="WC bulletin",
        source_type="text",
        state_code="CA",
        lob="workers_comp",
        status="indexed",
        chunk_count=3,
    )
    fake_doc.created_at = datetime.now(UTC)
    fake_doc.updated_at = datetime.now(UTC)

    async def fake_ingest(*args: Any, **kwargs: Any) -> Document:
        fake_db.add(fake_doc)
        return fake_doc

    monkeypatch.setattr(ingest_service, "ingest_text", fake_ingest)
    monkeypatch.setattr(rulesense_api.ingest_service, "ingest_text", fake_ingest)

    response = await client.post(
        "/api/v1/rulesense/documents",
        headers={"Authorization": "Bearer dev-bypass"},
        json={
            "title": "WC bulletin",
            "text": "All workers compensation policies must include disclosure section.",
            "state_code": "CA",
            "lob": "workers_comp",
        },
    )
    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["title"] == "WC bulletin"
    assert payload["stateCode"] == "CA"
    assert payload["chunkCount"] == 3


async def test_send_message_returns_event_stream(
    client: httpx.AsyncClient,
    fake_db: FakeSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Seed a session into the fake DB
    session = ChatSession(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
        title="New chat",
        message_count=0,
    )
    session.created_at = datetime.now(UTC)
    session.updated_at = datetime.now(UTC)
    fake_db.add(session)

    def fake_stream(**_kwargs: Any) -> AsyncIterator[dict[str, Any]]:
        async def _gen() -> AsyncIterator[dict[str, Any]]:
            yield {"type": "citations", "citations": []}
            yield {"type": "token", "text": "Hello "}
            yield {"type": "token", "text": "world"}
            yield {"type": "done", "usage": {"input_tokens": 1, "output_tokens": 2}}

        return _gen()

    monkeypatch.setattr(rulesense_service, "stream_chat_response", fake_stream)
    monkeypatch.setattr(
        rulesense_api.rulesense_service,
        "stream_chat_response",
        fake_stream,
    )

    response = await client.post(
        f"/api/v1/rulesense/sessions/{session.id}/messages",
        headers={"Authorization": "Bearer dev-bypass"},
        json={"text": "What are the CA workers comp disclosure requirements?"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    body = response.text
    assert "event: citations" in body
    assert "event: token" in body
    assert "event: done" in body
