"""RegScout API — sources, discovery jobs, discovered documents."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import DiscoveredDocument, RegulatorySource
from app.services import jobs as jobs_service

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas — sources
# ---------------------------------------------------------------------------


class SourceResponse(BaseModel):
    id: uuid.UUID
    name: str
    url: str
    source_type: str = Field(..., alias="sourceType")
    state_code: str | None = Field(None, alias="stateCode")
    lob: str | None
    enabled: bool
    last_checked_at: datetime | None = Field(None, alias="lastCheckedAt")
    last_status: str | None = Field(None, alias="lastStatus")
    last_error: str | None = Field(None, alias="lastError")
    discovered_doc_count: int = Field(..., alias="discoveredDocCount")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CreateSourceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=8, max_length=2048)
    source_type: str = Field(default="custom", max_length=32)
    state_code: str | None = Field(default=None, max_length=8)
    lob: str | None = Field(default=None, max_length=64)


class UpdateSourceRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    enabled: bool | None = None
    lob: str | None = Field(default=None, max_length=64)
    state_code: str | None = Field(default=None, max_length=8)


# ---------------------------------------------------------------------------
# Schemas — discovery / documents
# ---------------------------------------------------------------------------


class DiscoveryRequest(BaseModel):
    source_ids: list[uuid.UUID] | None = Field(default=None, alias="sourceIds")
    state_codes: list[str] | None = Field(default=None, alias="stateCodes")
    all: bool = False

    model_config = {"populate_by_name": True}


class JobIdResponse(BaseModel):
    job_id: uuid.UUID = Field(..., alias="jobId")

    model_config = {"populate_by_name": True}


class DiscoveredDocumentResponse(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID = Field(..., alias="sourceId")
    url: str
    title: str | None
    content_type: str | None = Field(None, alias="contentType")
    status: str
    ingested_document_id: uuid.UUID | None = Field(None, alias="ingestedDocumentId")
    discovered_at: datetime = Field(..., alias="discoveredAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Source routes
# ---------------------------------------------------------------------------


@router.get("/sources", response_model=list[SourceResponse])
async def list_sources(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    state_code: str | None = None,
    lob: str | None = None,
) -> list[SourceResponse]:
    stmt = (
        select(RegulatorySource)
        .where(RegulatorySource.deleted_at.is_(None))
        .order_by(RegulatorySource.name.asc())
    )
    if state_code:
        stmt = stmt.where(RegulatorySource.state_code == state_code)
    if lob:
        stmt = stmt.where(RegulatorySource.lob == lob)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [SourceResponse.model_validate(r) for r in rows]


@router.post(
    "/sources",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_source(
    body: CreateSourceRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SourceResponse:
    source = RegulatorySource(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        name=body.name,
        url=body.url,
        source_type=body.source_type,
        state_code=body.state_code,
        lob=body.lob,
        enabled=True,
        discovered_doc_count=0,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)
    return SourceResponse.model_validate(source)


@router.patch("/sources/{source_id}", response_model=SourceResponse)
async def update_source(
    source_id: uuid.UUID,
    body: UpdateSourceRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SourceResponse:
    source = await _load_source(db, source_id)
    if body.name is not None:
        source.name = body.name
    if body.enabled is not None:
        source.enabled = body.enabled
    if body.lob is not None:
        source.lob = body.lob or None
    if body.state_code is not None:
        source.state_code = body.state_code or None
    await db.commit()
    await db.refresh(source)
    return SourceResponse.model_validate(source)


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_source(
    source_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    source = await _load_source(db, source_id)
    source.deleted_at = datetime.now(UTC)
    source.deleted_by = user.user_id
    source.enabled = False
    await db.commit()


# ---------------------------------------------------------------------------
# Discovery + discovered documents
# ---------------------------------------------------------------------------


@router.post(
    "/discover",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_discovery(
    body: DiscoveryRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    if not (body.all or body.source_ids or body.state_codes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide one of: source_ids, state_codes, or all=true",
        )

    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="regscout.discover",
        input={
            "all": body.all,
            "source_ids": [str(s) for s in (body.source_ids or [])],
            "state_codes": body.state_codes or [],
        },
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


@router.get("/documents", response_model=list[DiscoveredDocumentResponse])
async def list_discovered_documents(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    source_id: uuid.UUID | None = Query(default=None, alias="sourceId"),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[DiscoveredDocumentResponse]:
    stmt = select(DiscoveredDocument).order_by(DiscoveredDocument.discovered_at.desc()).limit(limit)
    if source_id:
        stmt = stmt.where(DiscoveredDocument.source_id == source_id)
    if status_filter:
        stmt = stmt.where(DiscoveredDocument.status == status_filter)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [DiscoveredDocumentResponse.model_validate(r) for r in rows]


@router.post(
    "/documents/{discovered_id}/ingest",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def queue_ingest(
    discovered_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    discovered = await db.get(DiscoveredDocument, discovered_id)
    if discovered is None or discovered.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discovered document not found",
        )

    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="regingest.ingest_url",
        input={"discovered_document_id": str(discovered.id)},
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_source(db: AsyncSession, source_id: uuid.UUID) -> RegulatorySource:
    source = await db.get(RegulatorySource, source_id)
    if source is None or source.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    return source
