"""RuleSense API — chat sessions, messages (SSE), documents."""

from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import ChatMessage, ChatSession, Document, DocumentChunk
from app.services import ingest as ingest_service
from app.services import rulesense as rulesense_service

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    message_count: int = Field(..., alias="messageCount")
    last_message_at: datetime | None = Field(None, alias="lastMessageAt")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID = Field(..., alias="sessionId")
    role: str
    content: str
    citations: list[dict[str, Any]] | None = None
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class SessionWithMessagesResponse(BaseModel):
    session: ChatSessionResponse
    messages: list[ChatMessageResponse]


class SendMessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=8000)


class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    source_type: str = Field(..., alias="sourceType")
    state_code: str | None = Field(None, alias="stateCode")
    lob: str | None
    status: str
    chunk_count: int = Field(..., alias="chunkCount")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CreateDocumentRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    text: str = Field(..., min_length=1)
    source_type: str = Field(default="text", max_length=32)
    state_code: str | None = Field(default=None, max_length=8)
    lob: str | None = Field(default=None, max_length=64)
    source_url: str | None = Field(default=None, max_length=2048)


# ---------------------------------------------------------------------------
# Session endpoints
# ---------------------------------------------------------------------------


@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ChatSessionResponse]:
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user.user_id)
        .where(ChatSession.deleted_at.is_(None))
        .order_by(ChatSession.last_message_at.desc().nullslast(), ChatSession.created_at.desc())
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [ChatSessionResponse.model_validate(s) for s in sessions]


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ChatSessionResponse:
    session = ChatSession(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        title="New chat",
        message_count=0,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ChatSessionResponse.model_validate(session)


@router.get("/sessions/{session_id}", response_model=SessionWithMessagesResponse)
async def get_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SessionWithMessagesResponse:
    session = await _load_session(db, session_id, user)

    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return SessionWithMessagesResponse(
        session=ChatSessionResponse.model_validate(session),
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    session = await _load_session(db, session_id, user)
    session.deleted_at = datetime.now(UTC)
    session.deleted_by = user.user_id
    await db.commit()


# ---------------------------------------------------------------------------
# Streaming message endpoint
# ---------------------------------------------------------------------------


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n".encode()


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: uuid.UUID,
    body: SendMessageRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    session = await _load_session(db, session_id, user)

    async def event_stream() -> AsyncIterator[bytes]:
        try:
            async for event in rulesense_service.stream_chat_response(
                db=db,
                session=session,
                user_message=body.text,
                current_user=user,
            ):
                etype = event.get("type", "message")
                yield _sse(etype, event)
        except Exception as exc:  # pragma: no cover — best-effort safety net
            logger.exception("rulesense_stream_failed", error=str(exc))
            yield _sse("error", {"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Document endpoints
# ---------------------------------------------------------------------------


@router.get("/documents", response_model=list[DocumentResponse])
async def list_documents(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    stmt = (
        select(Document).where(Document.deleted_at.is_(None)).order_by(Document.created_at.desc())
    )
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    body: CreateDocumentRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    try:
        document = await ingest_service.ingest_text(
            db=db,
            tenant_id=user.tenant_id,
            title=body.title,
            text=body.text,
            source_type=body.source_type,
            state_code=body.state_code,
            lob=body.lob,
            source_url=body.source_url,
        )
        await db.commit()
        await db.refresh(document)
        return DocumentResponse.model_validate(document)
    except HTTPException:
        await db.rollback()
        raise
    except Exception as exc:
        await db.rollback()
        logger.exception("document_create_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {exc}",
        ) from exc


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    document = await db.get(Document, document_id)
    if document is None or document.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Hard-delete chunks (no soft-delete on chunks).
    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))

    document.deleted_at = datetime.now(UTC)
    document.deleted_by = user.user_id
    document.chunk_count = 0
    await db.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_session(
    db: AsyncSession,
    session_id: uuid.UUID,
    user: CurrentUser,
) -> ChatSession:
    session = await db.get(ChatSession, session_id)
    if session is None or session.deleted_at is not None or session.user_id != user.user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return session
