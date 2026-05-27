"""Unit tests for the Postgres-backed job queue service.

We avoid a live database by leveraging the same fake-session pattern used
in `test_rulesense_routes.py`. The ``claim_next_job`` path is the only
piece that hits real SQL; we test it with a per-test stub that mimics
``FOR UPDATE SKIP LOCKED`` ordering.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

import pytest

from app.db.models import Job
from app.services import jobs as jobs_service

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")


# ---------------------------------------------------------------------------
# Minimal fake session — enough to exercise the jobs service
# ---------------------------------------------------------------------------


class _Result:
    def __init__(self, rows: list[Any]) -> None:
        self._rows = rows

    def first(self) -> Any | None:
        return self._rows[0] if self._rows else None

    def scalars(self) -> _Result:
        return self

    def all(self) -> list[Any]:
        return list(self._rows)


class FakeSession:
    """In-memory job store with FIFO/priority claim semantics."""

    def __init__(self) -> None:
        self.jobs: dict[uuid.UUID, Job] = {}
        self.commits = 0

    def add(self, instance: Any) -> None:
        now = datetime.now(UTC)
        if getattr(instance, "created_at", None) is None:
            instance.created_at = now
        if getattr(instance, "updated_at", None) is None:
            instance.updated_at = now
        if isinstance(instance, Job):
            self.jobs[instance.id] = instance

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        return None

    async def refresh(self, _instance: Any) -> None:
        return None

    async def close(self) -> None:
        return None

    async def get(self, entity: type, identifier: uuid.UUID) -> Any:
        if entity is Job:
            return self.jobs.get(identifier)
        return None

    async def execute(self, stmt: Any, params: dict[str, Any] | None = None) -> _Result:
        text = str(stmt).lower()

        # claim_next_job select
        if "select id" in text and "for update skip locked" in text:
            candidates = sorted(
                (j for j in self.jobs.values() if j.status == "queued"),
                key=lambda j: (j.priority, j.created_at),
            )
            return _Result([(candidates[0].id,)] if candidates else [])

        # claim_next_job update
        if text.strip().startswith("update jobs"):
            job_id = (params or {}).get("job_id")
            worker_id = (params or {}).get("worker_id")
            now = (params or {}).get("now") or datetime.now(UTC)
            job = self.jobs.get(job_id)
            if job is not None:
                job.status = "running"
                job.worker_id = worker_id
                job.claimed_at = now
                job.started_at = now
                job.attempts = (job.attempts or 0) + 1
                job.updated_at = now
                return _Result([(job.id,)])
            return _Result([])

        return _Result([])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.fixture
def db() -> FakeSession:
    return FakeSession()


async def test_enqueue_job_creates_queued_row(db: FakeSession) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=USER_ID,
        job_type="regscout.discover",
        input={"all": True},
        priority=3,
    )

    assert job.status == "queued"
    assert job.priority == 3
    assert job.tenant_id == TENANT_ID
    assert job.user_id == USER_ID
    assert job.attempts == 0
    assert job.input == {"all": True}
    assert db.jobs[job.id] is job


async def test_claim_next_job_picks_highest_priority(db: FakeSession) -> None:
    low_pri = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
        priority=9,
    )
    high_pri = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
        priority=1,
    )

    claimed = await jobs_service.claim_next_job(db, worker_id="worker-a")
    assert claimed is not None
    assert claimed.id == high_pri.id
    assert claimed.status == "running"
    assert claimed.worker_id == "worker-a"
    assert claimed.attempts == 1
    # Lower-priority job is still queued
    assert db.jobs[low_pri.id].status == "queued"


async def test_claim_next_job_returns_none_when_empty(db: FakeSession) -> None:
    result = await jobs_service.claim_next_job(db, worker_id="w")
    assert result is None


async def test_report_progress_updates_row(db: FakeSession) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
    )

    await jobs_service.report_progress(db, job.id, 42, "Halfway")
    assert db.jobs[job.id].progress == 42
    assert db.jobs[job.id].progress_message == "Halfway"

    # Out-of-range values are clamped
    await jobs_service.report_progress(db, job.id, 500, None)
    assert db.jobs[job.id].progress == 100
    await jobs_service.report_progress(db, job.id, -7, None)
    assert db.jobs[job.id].progress == 0


async def test_complete_job_marks_completed(db: FakeSession) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
    )
    await jobs_service.complete_job(db, job.id, output={"sources_scanned": 7})

    completed = db.jobs[job.id]
    assert completed.status == "completed"
    assert completed.progress == 100
    assert completed.output == {"sources_scanned": 7}
    assert completed.completed_at is not None


async def test_fail_job_requeues_until_max_attempts(db: FakeSession) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
        max_attempts=2,
    )

    # First failure → requeued
    db.jobs[job.id].attempts = 1
    await jobs_service.fail_job(db, job.id, "Network blip", retry=True)
    assert db.jobs[job.id].status == "queued"
    assert db.jobs[job.id].error == "Network blip"

    # Second failure at max_attempts → terminal
    db.jobs[job.id].attempts = 2
    await jobs_service.fail_job(db, job.id, "Final error", retry=True)
    assert db.jobs[job.id].status == "failed"
    assert db.jobs[job.id].error == "Final error"
    assert db.jobs[job.id].completed_at is not None


async def test_fail_job_with_retry_false_marks_failed_immediately(
    db: FakeSession,
) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
    )
    db.jobs[job.id].attempts = 1
    await jobs_service.fail_job(db, job.id, "bad input", retry=False)
    assert db.jobs[job.id].status == "failed"


async def test_cancel_job_only_works_on_queued(db: FakeSession) -> None:
    job = await jobs_service.enqueue_job(
        db,
        tenant_id=TENANT_ID,
        user_id=None,
        job_type="regscout.discover",
    )
    cancelled = await jobs_service.cancel_job(db, job.id)
    assert cancelled is True
    assert db.jobs[job.id].status == "cancelled"

    # Re-cancelling fails
    cancelled_again = await jobs_service.cancel_job(db, job.id)
    assert cancelled_again is False
