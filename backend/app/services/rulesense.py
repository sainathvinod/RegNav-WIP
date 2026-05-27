"""RuleSense RAG chat orchestrator.

Pipeline:
  1. Persist the user message.
  2. Embed the query.
  3. Retrieve top-K relevant chunks via pgvector cosine similarity.
  4. Build a citation-aware system prompt + recent message history.
  5. Stream tokens from Anthropic to the caller.
  6. After the stream completes, persist the assistant message with
     citations + token counts.
"""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import ChatMessage, ChatSession, Document, DocumentChunk
from app.llm.anthropic_chat import stream_chat
from app.llm.embeddings import EmbeddingClient

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are RuleSense, RegNav.AI's regulatory compliance assistant for US "
    "insurance carriers. Answer questions using ONLY the provided context. "
    "Cite sources inline using [N] where N is the document number from the "
    "context list. If the context doesn't contain the answer, say so clearly "
    "and recommend the user ingest the relevant regulatory document."
)


@dataclass
class ChunkResult:
    """A single retrieval hit."""

    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    chunk_index: int
    text: str
    score: float


# ---------------------------------------------------------------------------
# Retrieval
# ---------------------------------------------------------------------------


async def retrieve_relevant_chunks(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    query_embedding: list[float],
    top_k: int = 5,
    filters: dict[str, Any] | None = None,
) -> list[ChunkResult]:
    """Cosine-similarity search over document_chunks for the current tenant.

    `filters` may include `state_code`, `lob`, and `document_id`.
    Returns the top-K chunks sorted by similarity (lower distance = better).
    """
    filters = filters or {}

    # Render the embedding as a pgvector literal '[a,b,c]'
    vec_literal = "[" + ",".join(repr(float(x)) for x in query_embedding) + "]"

    params: dict[str, Any] = {
        "tenant_id": str(tenant_id),
        "top_k": int(top_k),
    }

    where_clauses = ["dc.tenant_id = :tenant_id"]
    if state := filters.get("state_code"):
        where_clauses.append("d.state_code = :state_code")
        params["state_code"] = state
    if lob := filters.get("lob"):
        where_clauses.append("d.lob = :lob")
        params["lob"] = lob
    if doc_id := filters.get("document_id"):
        where_clauses.append("dc.document_id = :document_id")
        params["document_id"] = str(doc_id)
    # Only surface chunks from non-soft-deleted, indexed documents
    where_clauses.append("d.deleted_at IS NULL")
    where_clauses.append("d.status = 'indexed'")

    sql = text(
        f"""
        SELECT
            dc.id AS chunk_id,
            dc.document_id,
            d.title AS document_title,
            dc.chunk_index,
            dc.text,
            (dc.embedding <=> CAST(:vec AS vector)) AS distance
        FROM document_chunks dc
        JOIN documents d ON d.id = dc.document_id
        WHERE {" AND ".join(where_clauses)}
        ORDER BY dc.embedding <=> CAST(:vec AS vector)
        LIMIT :top_k
        """
    )
    params["vec"] = vec_literal

    result = await db.execute(sql, params)
    rows = result.mappings().all()

    return [
        ChunkResult(
            chunk_id=row["chunk_id"],
            document_id=row["document_id"],
            document_title=row["document_title"],
            chunk_index=row["chunk_index"],
            text=row["text"],
            # Convert cosine distance (0=identical) to similarity (1=identical).
            score=max(0.0, 1.0 - float(row["distance"])),
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Streaming chat pipeline
# ---------------------------------------------------------------------------


def _build_context(chunks: list[ChunkResult]) -> str:
    parts: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        parts.append(
            f"[{i}] {chunk.document_title}\n{chunk.text.strip()}",
        )
    return "\n\n---\n\n".join(parts)


def _build_system_prompt(chunks: list[ChunkResult]) -> str:
    if not chunks:
        return (
            SYSTEM_PROMPT
            + "\n\nCONTEXT:\n(No relevant documents found in the index for this query.)"
        )
    return SYSTEM_PROMPT + "\n\nCONTEXT:\n" + _build_context(chunks)


def _citations_payload(chunks: list[ChunkResult]) -> list[dict[str, Any]]:
    return [
        {
            "documentId": str(c.document_id),
            "documentTitle": c.document_title,
            "chunkId": str(c.chunk_id),
            "chunkIndex": c.chunk_index,
            "score": round(c.score, 4),
            "snippet": c.text[:400],
        }
        for c in chunks
    ]


async def _load_history(
    db: AsyncSession,
    session_id: uuid.UUID,
    limit_turns: int = 10,
) -> list[dict[str, str]]:
    """Load the last `limit_turns * 2` messages and shape them for Anthropic."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .where(ChatMessage.role.in_(("user", "assistant")))
        .order_by(ChatMessage.created_at.desc())
        .limit(limit_turns * 2)
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    rows.reverse()
    return [{"role": m.role, "content": m.content} for m in rows]


async def stream_chat_response(
    db: AsyncSession,
    session: ChatSession,
    user_message: str,
    current_user: CurrentUser,
    *,
    embedding_client: EmbeddingClient | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Drive a single user turn through the RAG + streaming chat pipeline."""
    embedder = embedding_client or EmbeddingClient()
    started = time.monotonic()

    # ---- Persist the user message ----------------------------------------
    user_msg = ChatMessage(
        id=uuid.uuid4(),
        tenant_id=session.tenant_id,
        session_id=session.id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    session.message_count = (session.message_count or 0) + 1
    session.last_message_at = user_msg.created_at  # may be None pre-flush
    if session.title == "New chat":
        session.title = user_message.strip().splitlines()[0][:100] or "New chat"
    await db.flush()

    # ---- Embed query + retrieve ------------------------------------------
    try:
        query_embedding = await embedder.embed_single(user_message)
    except Exception as exc:
        logger.exception("embed_query_failed", error=str(exc))
        yield {"type": "error", "message": "Failed to embed query"}
        return

    chunks = await retrieve_relevant_chunks(
        db,
        tenant_id=current_user.tenant_id,
        query_embedding=query_embedding,
        top_k=settings.rag_top_k,
    )

    citations = _citations_payload(chunks)
    yield {"type": "citations", "citations": citations}

    # ---- Build prompt + recent history -----------------------------------
    system_prompt = _build_system_prompt(chunks)
    history = await _load_history(db, session.id)
    messages = [*history, {"role": "user", "content": user_message}]

    # ---- Stream from Anthropic -------------------------------------------
    full_text_parts: list[str] = []
    usage: dict[str, int] = {"input_tokens": 0, "output_tokens": 0}
    errored: str | None = None

    async for event in stream_chat(
        messages=messages,
        system=system_prompt,
        model=settings.chat_model,
    ):
        etype = event.get("type")
        if etype == "token":
            text_piece = event.get("text", "")
            if text_piece:
                full_text_parts.append(text_piece)
                yield {"type": "token", "text": text_piece}
        elif etype == "done":
            usage = event.get("usage") or usage
            break
        elif etype == "error":
            errored = event.get("message") or "Unknown upstream error"
            yield {"type": "error", "message": errored}
            break

    latency_ms = int((time.monotonic() - started) * 1000)

    # ---- Persist assistant message ---------------------------------------
    if not errored:
        assistant_msg = ChatMessage(
            id=uuid.uuid4(),
            tenant_id=session.tenant_id,
            session_id=session.id,
            role="assistant",
            content="".join(full_text_parts),
            citations=citations,
            model=settings.chat_model,
            prompt_tokens=usage.get("input_tokens"),
            completion_tokens=usage.get("output_tokens"),
            latency_ms=latency_ms,
        )
        db.add(assistant_msg)
        session.message_count = (session.message_count or 0) + 1
        session.last_message_at = assistant_msg.created_at
        await db.commit()

        yield {
            "type": "done",
            "usage": usage,
            "latency_ms": latency_ms,
        }
    else:
        await db.commit()


# Re-export so callers can introspect without importing models directly.
__all__ = [
    "ChunkResult",
    "Document",
    "DocumentChunk",
    "retrieve_relevant_chunks",
    "stream_chat_response",
]
