"""Synchronous text-ingestion pipeline for the RuleSense RAG store.

For Phase 2 we accept plaintext only. PDF / file uploads with Azure Document
Intelligence land in Phase 3, along with a real background queue.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import Document, DocumentChunk
from app.llm.embeddings import EmbeddingClient
from app.services.chunking import chunk_text

logger = get_logger(__name__)


async def ingest_text(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    title: str,
    text: str,
    *,
    source_type: str = "text",
    state_code: str | None = None,
    lob: str | None = None,
    source_url: str | None = None,
    embedding_client: EmbeddingClient | None = None,
) -> Document:
    """Create a Document, chunk + embed its text, persist everything.

    All steps run inside the caller's session so RLS context is preserved.
    """
    embedder = embedding_client or EmbeddingClient()

    document = Document(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        title=title[:512],
        source_url=source_url,
        source_type=source_type,
        state_code=state_code,
        lob=lob,
        status="processing",
        chunk_count=0,
    )
    db.add(document)
    await db.flush()

    try:
        chunks = chunk_text(
            text,
            chunk_size=settings.rag_chunk_size,
            overlap=settings.rag_chunk_overlap,
        )

        if not chunks:
            document.status = "indexed"
            document.chunk_count = 0
            await db.flush()
            return document

        embeddings = await embedder.embed(chunks)
        if len(embeddings) != len(chunks):
            raise RuntimeError(
                f"Embedding count mismatch: {len(embeddings)} != {len(chunks)}",
            )

        rows: list[DocumentChunk] = []
        for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            rows.append(
                DocumentChunk(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    document_id=document.id,
                    chunk_index=index,
                    text=chunk,
                    embedding=embedding,
                    token_count=max(1, len(chunk) // 4),
                    chunk_metadata={
                        "state_code": state_code,
                        "lob": lob,
                        "document_title": document.title,
                    },
                )
            )
        db.add_all(rows)

        document.status = "indexed"
        document.chunk_count = len(rows)
        await db.flush()

        logger.info(
            "document_ingested",
            document_id=str(document.id),
            tenant_id=str(tenant_id),
            chunk_count=len(rows),
        )
        return document

    except Exception as exc:
        document.status = "failed"
        document.error_message = str(exc)[:2000]
        await db.flush()
        logger.exception(
            "document_ingest_failed",
            document_id=str(document.id),
            error=str(exc),
        )
        raise
