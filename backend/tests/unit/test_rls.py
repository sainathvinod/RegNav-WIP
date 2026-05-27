"""Unit tests for the Row-Level Security GUC helper."""

import uuid
from unittest.mock import AsyncMock

import pytest

from app.db.rls import set_tenant_guc


def _make_session() -> AsyncMock:
    session = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_set_tenant_guc_with_tenant_id() -> None:
    """set_tenant_guc with a real UUID → calls set_config with the string UUID."""
    session = _make_session()
    tenant_id = uuid.UUID("12345678-1234-5678-1234-567812345678")

    await set_tenant_guc(session, tenant_id)

    session.execute.assert_awaited_once()
    args, _kwargs = session.execute.await_args
    sql_text = str(args[0])
    assert "set_config" in sql_text
    assert "app.current_tenant" in sql_text
    assert args[1] == {"tid": str(tenant_id)}


@pytest.mark.asyncio
async def test_set_tenant_guc_with_none() -> None:
    """set_tenant_guc with None → clears the GUC (empty string)."""
    session = _make_session()

    await set_tenant_guc(session, None)

    session.execute.assert_awaited_once()
    args, _ = session.execute.await_args
    sql_text = str(args[0])
    assert "set_config" in sql_text
    assert "app.current_tenant" in sql_text
    # No parameters dict for the empty-string branch
    assert len(args) == 1
