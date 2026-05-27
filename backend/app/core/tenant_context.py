"""Per-request tenant context.

In Phase 1 this is populated by the JWT auth middleware. Once set, the
SQLAlchemy session middleware uses `tenant_id` to set the
`app.current_tenant` Postgres GUC so RLS policies enforce isolation at
the database layer.
"""

from contextvars import ContextVar
from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class TenantContext:
    tenant_id: UUID
    user_id: UUID
    roles: tuple[str, ...]


_tenant_context: ContextVar[TenantContext | None] = ContextVar("tenant_context", default=None)


def set_tenant_context(ctx: TenantContext) -> None:
    _tenant_context.set(ctx)


def get_tenant_context() -> TenantContext | None:
    return _tenant_context.get()


def require_tenant_context() -> TenantContext:
    ctx = _tenant_context.get()
    if ctx is None:
        raise RuntimeError("Tenant context not set. This request was not authenticated.")
    return ctx
