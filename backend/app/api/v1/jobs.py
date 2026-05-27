"""Job-queue API — list, fetch, cancel, and stream progress events."""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import AsyncSessionLocal, get_db
from app.db.models import Job
from app.db.rls import set_tenant_guc
from app.services import jobs as jobs_service

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class JobResponse(BaseModel):
    id: uuid.UUID
    type: str
    status: str
    priority: int
    progress: int
    progress_message: str | None = Field(None, alias="progressMessage")
    input: dict[str, Any]
    output: dict[str, Any] | None = None
    error: str | None = None
    attempts: int
    max_attempts: int = Field(..., alias="maxAttempts")
    worker_id: str | None = Field(None, alias="workerId")
    created_at: datetime = Field(..., alias="createdAt")
    started_at: datetime | None = Field(None, alias="startedAt")
    completed_at: datetime | None = Field(None, alias="completedAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status"),
    job_type: str | None = Query(default=None, alias="type"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[JobResponse]:
    stmt = (
        select(Job)
        .where(Job.tenant_id == user.tenant_id)
        .order_by(Job.created_at.desc())
        .limit(limit)
    )
    if status_filter:
        stmt = stmt.where(Job.status == status_filter)
    if job_type:
        stmt = stmt.where(Job.type == job_type)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [JobResponse.model_validate(j) for j in rows]


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    job = await _load_job(db, job_id, user)
    return JobResponse.model_validate(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_job(
    job_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    job = await _load_job(db, job_id, user)
    if job.status != "queued":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a job in status '{job.status}' — only queued jobs are cancellable",
        )
    await jobs_service.cancel_job(db, job_id)


# ---------------------------------------------------------------------------
# Server-Sent Events stream
# ---------------------------------------------------------------------------


def _sse(event: str, payload: dict[str, Any]) -> bytes:
    return f"event: {event}\ndata: {json.dumps(payload, default=str)}\n\n".encode()


def _snapshot(job: Job) -> dict[str, Any]:
    return {
        "id": str(job.id),
        "type": job.type,
        "status": job.status,
        "progress": job.progress,
        "message": job.progress_message,
        "error": job.error,
        "output": job.output,
        "attempts": job.attempts,
    }


@router.get("/{job_id}/events")
async def stream_job_events(
    job_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """SSE stream emitting one event each time the job row changes.

    Closes once the job reaches a terminal status (completed/failed/cancelled).
    """
    # Validate access up front using the request's RLS-scoped session.
    job = await _load_job(db, job_id, user)
    tenant_id = job.tenant_id

    async def _events() -> AsyncIterator[bytes]:
        last_snapshot: dict[str, Any] | None = None
        ticks = 0
        max_ticks = 60 * 60 * 2  # ~60 minutes at 500ms

        while ticks < max_ticks:
            ticks += 1

            # Use a fresh session each tick so we see committed worker writes.
            async with AsyncSessionLocal() as session:
                await set_tenant_guc(session, tenant_id)
                current = await session.get(Job, job_id)

            if current is None:
                yield _sse("error", {"message": "Job not found"})
                return

            snap = _snapshot(current)
            if snap != last_snapshot:
                yield _sse("progress", snap)
                last_snapshot = snap

            if current.status in jobs_service.TERMINAL_STATUSES:
                yield _sse("done", snap)
                return

            await asyncio.sleep(0.5)

        yield _sse("timeout", {"message": "Stream timed out"})

    return StreamingResponse(
        _events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_job(db: AsyncSession, job_id: uuid.UUID, user: CurrentUser) -> Job:
    job = await db.get(Job, job_id)
    if job is None or job.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found",
        )
    return job
