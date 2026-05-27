"""Audit log read API — surfaces immutable audit entries for compliance review."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.db.engine import get_db
from app.db.models import AuditLog

router = APIRouter()


class AuditEntry(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None = Field(None, alias="userId")
    action: str
    resource_type: str = Field(..., alias="resourceType")
    resource_id: uuid.UUID | None = Field(None, alias="resourceId")
    ip_address: str | None = Field(None, alias="ipAddress")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


@router.get("", response_model=list[AuditEntry])
async def list_audit_entries(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    action: str | None = None,
    resource_type: str | None = Query(default=None, alias="resourceType"),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[AuditEntry]:
    """List audit entries for the current tenant, newest first."""
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == user.tenant_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        AuditEntry(
            id=r.id,
            userId=r.user_id,
            action=r.action,
            resourceType=r.resource_type,
            resourceId=r.resource_id,
            ipAddress=r.ip_address,
            createdAt=r.created_at,
        )
        for r in rows
    ]
