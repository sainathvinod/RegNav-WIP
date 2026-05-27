"""Handler: ``regscout.discover`` — run discovery against one or more sources."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Job, RegulatorySource
from app.services import regscout as regscout_service
from app.workers.runner import ProgressReporter

logger = get_logger(__name__)


async def _resolve_sources(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    input_payload: dict[str, Any],
) -> list[RegulatorySource]:
    stmt = (
        select(RegulatorySource)
        .where(RegulatorySource.tenant_id == tenant_id)
        .where(RegulatorySource.deleted_at.is_(None))
        .where(RegulatorySource.enabled.is_(True))
    )

    if input_payload.get("all"):
        result = await db.execute(stmt)
        return list(result.scalars().all())

    source_ids = input_payload.get("source_ids") or []
    if source_ids:
        ids = [uuid.UUID(str(s)) for s in source_ids]
        result = await db.execute(stmt.where(RegulatorySource.id.in_(ids)))
        return list(result.scalars().all())

    state_codes = input_payload.get("state_codes") or []
    if state_codes:
        result = await db.execute(stmt.where(RegulatorySource.state_code.in_(state_codes)))
        return list(result.scalars().all())

    return []


async def handle_regscout_discover(
    db: AsyncSession,
    job: Job,
    progress: ProgressReporter,
) -> dict[str, Any]:
    """Run discovery and aggregate per-source stats."""
    sources = await _resolve_sources(db, job.tenant_id, job.input or {})
    total = len(sources)
    if total == 0:
        return {"sources_scanned": 0, "total_discovered": 0, "total_new": 0}

    await progress.update(2, f"Scanning {total} sources")

    total_discovered = 0
    total_new = 0
    total_failed = 0
    per_source: list[dict[str, Any]] = []

    for idx, source in enumerate(sources, start=1):
        pct = max(2, int((idx - 1) / total * 90))
        await progress.update(pct, f"Scanning {source.name} ({idx}/{total})")

        async def source_progress(_pct: int, _msg: str | None) -> None:
            # Inner progress isn't surfaced; the outer per-source % suffices.
            return None

        result = await regscout_service.discover_from_source(
            db,
            source,
            progress=source_progress,
        )
        await db.commit()

        total_discovered += int(result.get("discovered", 0))
        total_new += int(result.get("new", 0))
        total_failed += int(result.get("failed", 0))
        per_source.append(
            {
                "source_id": str(source.id),
                "name": source.name,
                **result,
            }
        )
        logger.info(
            "regscout_source_done",
            source_id=str(source.id),
            **result,
        )

    await progress.update(100, f"Finished {total} sources")

    return {
        "sources_scanned": total,
        "total_discovered": total_discovered,
        "total_new": total_new,
        "total_failed": total_failed,
        "per_source": per_source,
    }
