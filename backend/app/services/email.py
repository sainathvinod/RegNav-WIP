"""Email sending abstraction.

In production we use Azure Communication Services (or SendGrid via SMTP).
In dev / tests we log the email to stdout instead of delivering it, so no
real account is required.

Configure via ``settings.email_provider`` and the related env vars.
"""

from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


async def send_email(
    *,
    to: str,
    subject: str,
    body: str,
    html_body: str | None = None,
) -> bool:
    """Send a single email. Returns True if dispatch succeeded.

    Never raises — a failed send logs a warning but does not interrupt
    the calling flow (invitations and job completions are best-effort).
    """
    provider = settings.email_provider

    if provider == "log":
        logger.info(
            "email_logged",
            to=to,
            subject=subject,
            preview=body[:120],
        )
        return True

    if provider == "acs":
        return await _send_via_acs(to=to, subject=subject, body=body, html_body=html_body)

    logger.warning("email_unknown_provider", provider=provider)
    return False


async def _send_via_acs(
    *,
    to: str,
    subject: str,
    body: str,
    html_body: str | None,
) -> bool:
    """Send via Azure Communication Services Email.

    Requires ``settings.acs_connection_string`` and
    ``settings.email_from_address`` (e.g. ``noreply@yourdomain.com``,
    must be a verified sender in your ACS resource).
    """
    if not settings.acs_connection_string or not settings.email_from_address:
        logger.warning("acs_not_configured", to=to)
        return False

    try:
        from azure.communication.email.aio import EmailClient
    except ImportError as exc:
        logger.warning("acs_sdk_missing", error=str(exc))
        return False

    message: dict = {  # type: ignore[type-arg]
        "senderAddress": settings.email_from_address,
        "recipients": {"to": [{"address": to}]},
        "content": {
            "subject": subject,
            "plainText": body,
        },
    }
    if html_body:
        message["content"]["html"] = html_body

    try:
        client = EmailClient.from_connection_string(settings.acs_connection_string)
        async with client:
            poller = await client.begin_send(message)
            result = await poller.result()
        logger.info("email_sent", to=to, subject=subject, message_id=getattr(result, "id", None))
        return True
    except Exception as exc:
        logger.warning("email_send_failed", to=to, error=str(exc))
        return False
