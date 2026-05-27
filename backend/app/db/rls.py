"""Row-Level Security helpers for Postgres."""

import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_tenant_guc(session: AsyncSession, tenant_id: uuid.UUID | None) -> None:
    """Set app.current_tenant GUC on the Postgres connection so RLS policies enforce isolation."""
    if tenant_id:
        await session.execute(
            text("SELECT set_config('app.current_tenant', :tid, true)"),
            {"tid": str(tenant_id)},
        )
    else:
        await session.execute(
            text("SELECT set_config('app.current_tenant', '', true)"),
        )
