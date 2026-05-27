"""Async job-queue helpers backed by a Postgres ``jobs`` table.

The queue is intentionally small. Atomic claim is implemented with
``SELECT ... FOR UPDATE SKIP LOCKED`` so any number of worker processes
can poll the same database without stepping on each other.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import String, bindparam, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Job

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Terminal statuses
# ---------------------------------------------------------------------------

TERMINAL_STATUSES = frozenset({"completed", "failed", "cancelled"})


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Enqueue
# ---------------------------------------------------------------------------


async def enqueue_job(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    job_type: str,
    input: dict[str, Any] | None = None,
    priority: int = 5,
    max_attempts: int = 3,
) -> Job:
    """Insert a new ``queued`` job and return the ORM row.

    The caller decides whether to ``commit()``. For HTTP handlers that need
    to return a ``job_id`` we commit, then let the worker pick it up.
    """
    job = Job(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        type=job_type,
        status="queued",
        priority=priority,
        input=input or {},
        output=None,
        error=None,
        progress=0,
        progress_message=None,
        attempts=0,
        max_attempts=max_attempts,
        worker_id=None,
    )
    db.add(job)
    await db.flush()
    logger.info(
        "job_enqueued",
        job_id=str(job.id),
        tenant_id=str(tenant_id),
        type=job_type,
        priority=priority,
    )
    return job


# ---------------------------------------------------------------------------
# Claim
# ---------------------------------------------------------------------------


async def claim_next_job(
    db: AsyncSession,
    worker_id: str,
    job_types: list[str] | None = None,
) -> Job | None:
    """Atomically claim the next available job.

    Uses ``FOR UPDATE SKIP LOCKED`` so concurrent workers never claim the
    same row. Increments ``attempts`` and stamps ``worker_id`` / timestamps.
    Returns ``None`` when the queue is empty.
    """
    now = _utcnow()

    select_sql = text(
        """
        SELECT id
        FROM jobs
        WHERE status = 'queued'
          AND (:filter_types = FALSE OR type = ANY(:job_types))
        ORDER BY priority ASC, created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
        """
    ).bindparams(
        bindparam(
            "job_types",
            value=list(job_types or []),
            type_=ARRAY(String),
            expanding=False,
        ),
        bindparam("filter_types", value=bool(job_types)),
    )

    result = await db.execute(select_sql)
    row = result.first()
    if row is None:
        return None

    job_id = row[0]

    update_sql = text(
        """
        UPDATE jobs
        SET status = 'running',
            worker_id = :worker_id,
            claimed_at = :now,
            started_at = :now,
            attempts = attempts + 1,
            updated_at = :now
        WHERE id = :job_id
        RETURNING id
        """
    ).bindparams(bindparam("job_id", type_=PG_UUID(as_uuid=True)))

    await db.execute(
        update_sql,
        {"worker_id": worker_id, "now": now, "job_id": job_id},
    )
    await db.commit()

    job = await db.get(Job, job_id)
    if job is not None:
        logger.info(
            "job_claimed",
            job_id=str(job.id),
            type=job.type,
            worker_id=worker_id,
            attempt=job.attempts,
        )
    return job


# ---------------------------------------------------------------------------
# Progress / completion
# ---------------------------------------------------------------------------


async def report_progress(
    db: AsyncSession,
    job_id: uuid.UUID,
    progress: int,
    message: str | None = None,
) -> None:
    """Update progress (0-100) and an optional human-readable message."""
    clamped = max(0, min(100, int(progress)))
    job = await db.get(Job, job_id)
    if job is None:
        return
    job.progress = clamped
    if message is not None:
        job.progress_message = message[:512]
    await db.commit()


async def complete_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    output: dict[str, Any] | None = None,
) -> None:
    """Mark a job as ``completed`` and persist its output payload."""
    job = await db.get(Job, job_id)
    if job is None:
        return
    job.status = "completed"
    job.progress = 100
    job.output = output or {}
    job.completed_at = _utcnow()
    await db.commit()
    logger.info("job_completed", job_id=str(job.id), type=job.type)


async def fail_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    error: str,
    retry: bool = True,
) -> None:
    """Mark a job failed.

    If ``retry`` is true and the job is below ``max_attempts``, it goes
    back to ``queued`` for another worker. Otherwise it lands in
    ``failed`` and the error message is stamped on the row.
    """
    job = await db.get(Job, job_id)
    if job is None:
        return

    trimmed = (error or "")[:8000]

    if retry and job.attempts < job.max_attempts:
        job.status = "queued"
        job.error = trimmed
        job.worker_id = None
        job.claimed_at = None
        job.started_at = None
        await db.commit()
        logger.warning(
            "job_requeued",
            job_id=str(job.id),
            type=job.type,
            attempt=job.attempts,
            max_attempts=job.max_attempts,
        )
        return

    job.status = "failed"
    job.error = trimmed
    job.completed_at = _utcnow()
    await db.commit()
    logger.error("job_failed", job_id=str(job.id), type=job.type, error=trimmed)


async def cancel_job(db: AsyncSession, job_id: uuid.UUID) -> bool:
    """Cancel a job. Only ``queued`` jobs can be cancelled.

    Returns ``True`` if the job moved to ``cancelled``, else ``False``.
    """
    job = await db.get(Job, job_id)
    if job is None or job.status != "queued":
        return False
    job.status = "cancelled"
    job.completed_at = _utcnow()
    await db.commit()
    logger.info("job_cancelled", job_id=str(job.id))
    return True
