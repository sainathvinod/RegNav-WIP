"""RegIngest API — list / ingest / delete documents via job queue."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import Document, DocumentChunk
from app.services import jobs as jobs_service

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    source_type: str = Field(..., alias="sourceType")
    source_url: str | None = Field(None, alias="sourceUrl")
    state_code: str | None = Field(None, alias="stateCode")
    lob: str | None
    status: str
    chunk_count: int = Field(..., alias="chunkCount")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class JobIdResponse(BaseModel):
    job_id: uuid.UUID = Field(..., alias="jobId")

    model_config = {"populate_by_name": True}


class IngestUrlRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)
    title: str | None = Field(default=None, max_length=512)
    state_code: str | None = Field(default=None, max_length=8)
    lob: str | None = Field(default=None, max_length=64)


class IngestTextRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    text: str = Field(..., min_length=1)
    state_code: str | None = Field(default=None, max_length=8)
    lob: str | None = Field(default=None, max_length=64)


# ---------------------------------------------------------------------------
# Routes
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
    rows = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in rows]


@router.post(
    "/from-url",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_from_url(
    body: IngestUrlRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="regingest.ingest_url",
        input={
            "url": body.url,
            "title": body.title,
            "state_code": body.state_code,
            "lob": body.lob,
        },
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


@router.post(
    "/from-text",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_from_text(
    body: IngestTextRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="regingest.ingest_text",
        input={
            "title": body.title,
            "text": body.text,
            "state_code": body.state_code,
            "lob": body.lob,
        },
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


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

    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
    document.deleted_at = datetime.now(UTC)
    document.deleted_by = user.user_id
    document.chunk_count = 0
    await db.commit()
