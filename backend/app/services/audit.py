"""Audit log service — write immutable audit entries.

Audit log rows are write-only; the table is INSERT-only and never updated
or deleted. Used to satisfy SOC 2 / compliance auditing requirements.
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import AuditLog

logger = get_logger(__name__)


async def record(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> None:
    """Append a row to the audit_log table. Caller commits.

    ``action`` is a short verb-noun string like ``rule.approve`` or
    ``org.create``. ``before`` and ``after`` are optional JSON snapshots
    of the resource (omit fields that aren't useful).
    """
    entry = AuditLog(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        before=before,
        after=after,
        ip_address=ip_address,
    )
    db.add(entry)
    logger.info(
        "audit_log",
        tenant_id=str(tenant_id),
        user_id=str(user_id) if user_id else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
    )
