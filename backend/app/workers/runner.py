"""Worker loop and progress reporter.

Handlers are async callables of the form::

    async def handler(db, job, progress) -> dict:
        ...

They return the ``output`` payload to be stored on the job row. Any
exception is caught by the runner and turned into a retry-or-fail.
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.engine import AsyncSessionLocal
from app.db.models import Job
from app.db.rls import set_tenant_guc
from app.services import jobs as jobs_service

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Progress reporter — bound to a single job_id
# ---------------------------------------------------------------------------


@dataclass
class ProgressReporter:
    """Convenience wrapper passed to each handler.

    Handlers call ``await progress.update(50, "Halfway")``. Internally the
    reporter opens a fresh session so progress updates are visible to the
    API process even while the handler's main transaction is open.
    """

    job_id: Any  # uuid.UUID

    async def update(self, percent: int, message: str | None = None) -> None:
        async with AsyncSessionLocal() as session:
            await jobs_service.report_progress(session, self.job_id, percent, message)


Handler = Callable[
    [AsyncSession, Job, ProgressReporter],
    Awaitable[dict[str, Any] | None],
]


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class WorkerRunner:
    """Long-running async loop that drains the job queue."""

    def __init__(
        self,
        worker_id: str,
        handlers: dict[str, Handler],
        poll_interval: float = 2.0,
    ) -> None:
        self.worker_id = worker_id
        self.handlers = handlers
        self.poll_interval = poll_interval
        self._stop_event = asyncio.Event()

    async def run(self) -> None:
        """Main loop. Returns only when :meth:`stop` is invoked."""
        logger.info(
            "worker_started",
            worker_id=self.worker_id,
            handlers=sorted(self.handlers.keys()),
        )
        job_types = list(self.handlers.keys())

        while not self._stop_event.is_set():
            try:
                handled = await self._tick(job_types)
            except Exception as exc:
                logger.exception("worker_tick_failed", error=str(exc))
                handled = False

            if not handled:
                with contextlib.suppress(TimeoutError):
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=self.poll_interval,
                    )

        logger.info("worker_stopped", worker_id=self.worker_id)

    async def stop(self) -> None:
        self._stop_event.set()

    # ---- internals -------------------------------------------------------

    async def _tick(self, job_types: list[str]) -> bool:
        """Process at most one job. Returns True if a job was handled."""
        async with AsyncSessionLocal() as claim_session:
            job = await jobs_service.claim_next_job(
                claim_session,
                worker_id=self.worker_id,
                job_types=job_types,
            )
        if job is None:
            return False

        handler = self.handlers.get(job.type)
        if handler is None:
            logger.error("worker_no_handler", job_id=str(job.id), type=job.type)
            async with AsyncSessionLocal() as session:
                await jobs_service.fail_job(
                    session,
                    job.id,
                    f"No handler registered for job type {job.type!r}",
                    retry=False,
                )
            return True

        reporter = ProgressReporter(job_id=job.id)

        try:
            async with AsyncSessionLocal() as work_session:
                await set_tenant_guc(work_session, job.tenant_id)
                output = await handler(work_session, job, reporter)
            async with AsyncSessionLocal() as session:
                await jobs_service.complete_job(session, job.id, output or {})
        except Exception as exc:
            logger.exception(
                "worker_handler_failed",
                job_id=str(job.id),
                type=job.type,
                error=str(exc),
            )
            async with AsyncSessionLocal() as session:
                await jobs_service.fail_job(session, job.id, str(exc), retry=True)
        return True
