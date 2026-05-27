"""Notifications API — list, unread count, mark read, mark all read."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.db.engine import get_db
from app.db.models import Notification

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class NotificationResponse(BaseModel):
    id: uuid.UUID
    event_type: str = Field(..., alias="eventType")
    title: str
    body: str | None
    link: str | None
    severity: str
    read_at: datetime | None = Field(None, alias="readAt")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class UnreadCountResponse(BaseModel):
    unread: int


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    unread_only: bool = Query(default=False, alias="unreadOnly"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[NotificationResponse]:
    """List notifications for the current user, newest first."""
    stmt = (
        select(Notification)
        .where(Notification.user_id == user.user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        NotificationResponse(
            id=r.id,
            eventType=r.event_type,
            title=r.title,
            body=r.body,
            link=r.link,
            severity=r.severity,
            readAt=r.read_at,
            createdAt=r.created_at,
        )
        for r in rows
    ]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UnreadCountResponse:
    """Return the number of unread notifications for the current user."""
    count = (
        await db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.user_id, Notification.read_at.is_(None))
        )
        or 0
    )
    return UnreadCountResponse(unread=int(count))


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
async def mark_read(
    notification_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    n = await db.get(Notification, notification_id)
    if n is None or n.user_id != user.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(n)
    return NotificationResponse(
        id=n.id,
        eventType=n.event_type,
        title=n.title,
        body=n.body,
        link=n.link,
        severity=n.severity,
        readAt=n.read_at,
        createdAt=n.created_at,
    )


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Mark every unread notification for this user as read."""
    stmt = (
        update(Notification)
        .where(Notification.user_id == user.user_id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(UTC))
    )
    await db.execute(stmt)
    await db.commit()
