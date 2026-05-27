"""Notifications service — write in-app rows and optionally email.

Notifications are best-effort: failures (e.g. email-send errors) are
logged but never propagated to the caller, since notifying is a side
effect, not the user's primary intent.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Notification, User
from app.services.email import send_email

logger = get_logger(__name__)


async def notify(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    event_type: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    severity: str = "info",
    payload: dict[str, Any] | None = None,
    send_email_too: bool = False,
) -> Notification:
    """Write a notification row. Optionally fire an email. Caller commits.

    The notification is returned so callers can include its id in tests
    or audit logs. Email dispatch happens *after* the in-app row is
    flushed so a transient email failure doesn't lose the notification.
    """
    notification = Notification(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        title=title[:255],
        body=body,
        link=link,
        severity=severity,
        payload=payload or {},
    )
    db.add(notification)
    await db.flush()

    logger.info(
        "notification_created",
        notification_id=str(notification.id),
        tenant_id=str(tenant_id),
        user_id=str(user_id),
        event_type=event_type,
    )

    if send_email_too:
        recipient = await db.get(User, user_id)
        if recipient is not None and recipient.email:
            ok = await send_email(
                to=recipient.email,
                subject=title,
                body=body or title,
            )
            if ok:
                notification.email_sent_at = datetime.now(UTC)
                await db.flush()

    return notification
