"""RegIngest API — list / ingest / delete documents via job queue."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import Document, DocumentChunk
from app.services import jobs as jobs_service
from app.services.blob_storage import get_storage

_MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB cap on uploaded PDFs

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
    archive_content_type: str | None = Field(None, alias="archiveContentType")
    archive_size_bytes: int | None = Field(None, alias="archiveSizeBytes")

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


@router.post(
    "/from-file",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_from_file(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    state_code: str | None = Form(default=None),
    lob: str | None = Form(default=None),
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    """Upload a PDF (or other supported file) and queue it for ingestion.

    The upload is read into memory, written to blob storage immediately,
    and then a worker job picks it up to extract text and embeddings.
    Holding the bytes in blob storage (not in the job row) keeps the job
    queue compact.
    """
    ctype = (file.content_type or "").lower()
    if "pdf" not in ctype and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported in this version.",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    # Stage the bytes in blob storage with a temporary key so the worker
    # can pull them out without inflating the job row.
    upload_key = f"_uploads/{user.tenant_id}/{uuid.uuid4()}.pdf"
    await get_storage().put(upload_key, contents, "application/pdf")

    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="regingest.ingest_file",
        input={
            "upload_key": upload_key,
            "filename": file.filename or "upload.pdf",
            "title": title,
            "state_code": state_code,
            "lob": lob,
        },
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


@router.get("/documents/{document_id}/archive")
async def get_archive(
    document_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Stream the archived raw bytes (original PDF / rendered HTML) back."""
    document = await db.get(Document, document_id)
    if document is None or document.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Document not found")
    if not document.archive_blob_key:
        raise HTTPException(status_code=404, detail="No archive available for this document")

    try:
        data = await get_storage().get(document.archive_blob_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Archived bytes missing from storage") from None

    return Response(
        content=data,
        media_type=document.archive_content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{document.title[:200]}.pdf"',
            "Cache-Control": "private, max-age=300",
        },
    )


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

    # Best-effort blob cleanup. Archives are immutable so a missing blob is fine.
    if document.archive_blob_key:
        try:
            await get_storage().delete(document.archive_blob_key)
        except Exception as exc:
            logger.warning("archive_delete_failed", key=document.archive_blob_key, error=str(exc))

    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
    document.deleted_at = datetime.now(UTC)
    document.deleted_by = user.user_id
    document.chunk_count = 0
    await db.commit()
