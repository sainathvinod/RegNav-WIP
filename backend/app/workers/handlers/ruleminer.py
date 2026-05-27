"""Worker handler for the ruleminer.extract job type."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Job
from app.services.ruleminer import extract_rules_from_document
from app.workers.runner import ProgressReporter

logger = get_logger(__name__)


async def handle_ruleminer_extract(
    db: AsyncSession,
    job: Job,
    progress: ProgressReporter,
) -> dict:  # type: ignore[type-arg]
    """Extract compliance rules from a document using the LLM.

    ``job.input`` must contain ``document_id`` (UUID string).
    Persists extracted Rule rows with status='draft' and returns a summary.
    """
    document_id = uuid.UUID(job.input["document_id"])
    tenant_id = job.tenant_id

    await progress.update(10, "Loading document chunks…")

    rules = await extract_rules_from_document(
        db,
        document_id=document_id,
        tenant_id=tenant_id,
    )

    await progress.update(80, f"Saving {len(rules)} extracted rules…")

    for rule in rules:
        db.add(rule)

    await db.commit()

    logger.info(
        "ruleminer_handler_done",
        job_id=str(job.id),
        document_id=str(document_id),
        rules_extracted=len(rules),
    )

    await progress.update(100, f"Extracted {len(rules)} draft rules")

    return {
        "document_id": str(document_id),
        "rules_extracted": len(rules),
        "rule_ids": [str(r.id) for r in rules],
    }
