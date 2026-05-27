"""Tenant endpoints (v1)."""

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import CurrentUser, get_current_user, require_platform_admin

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class TenantResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str


class CreateTenantRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=63, pattern=r"^[a-z0-9-]+$")
    status: str = Field(default="pending")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/me", response_model=TenantResponse)
async def get_current_tenant(
    user: CurrentUser = Depends(get_current_user),
) -> TenantResponse:
    """Return the tenant associated with the authenticated user."""
    # Phase 1: return info derived from the JWT claims.
    # Phase 2 will query the DB for full tenant details.
    return TenantResponse(
        id=user.tenant_id,
        name="",
        slug="",
        status="active",
    )


@router.post("", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: CreateTenantRequest,
    _admin: CurrentUser = Depends(require_platform_admin),
) -> TenantResponse:
    """Create a new tenant. Requires platform_admin role."""
    new_id = uuid.uuid4()
    # Phase 1: in-memory response only; DB persistence added in Phase 2.
    return TenantResponse(
        id=new_id,
        name=body.name,
        slug=body.slug,
        status=body.status,
    )
