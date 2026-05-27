"""Organizations API — tenant lifecycle management for platform admins."""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, require_platform_admin
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import Tenant, User
from app.services import audit

logger = get_logger(__name__)

router = APIRouter()

_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$|^[a-z0-9]$")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class OrgResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    user_count: int = Field(default=0, alias="userCount")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=63)
    status: str = Field(default="active")


class UpdateOrgRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = None


# ---------------------------------------------------------------------------
# Routes — all require platform_admin
# ---------------------------------------------------------------------------


@router.get("", response_model=list[OrgResponse])
async def list_organizations(
    _admin: CurrentUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[OrgResponse]:
    stmt = select(Tenant).where(Tenant.deleted_at.is_(None)).order_by(Tenant.created_at.desc())
    result = await db.execute(stmt)
    tenants = result.scalars().all()

    # Batch user counts
    user_counts: dict[uuid.UUID, int] = {}
    if tenants:
        tid_list = [t.id for t in tenants]
        counts_result = await db.execute(
            select(User.tenant_id, func.count())
            .where(User.tenant_id.in_(tid_list))
            .group_by(User.tenant_id)
        )
        user_counts = {row[0]: row[1] for row in counts_result}

    out: list[OrgResponse] = []
    for t in tenants:
        out.append(
            OrgResponse(
                id=t.id,
                name=t.name,
                slug=t.slug,
                status=t.status,
                userCount=user_counts.get(t.id, 0),
                createdAt=t.created_at,
            )
        )
    return out


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: CreateOrgRequest,
    admin: CurrentUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgResponse:
    if not _SLUG_RE.match(body.slug):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Slug must be lowercase alphanumeric with hyphens only",
        )

    existing = await db.execute(
        select(Tenant).where(Tenant.slug == body.slug, Tenant.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Slug '{body.slug}' is already taken",
        )

    tenant = Tenant(
        id=uuid.uuid4(),
        name=body.name,
        slug=body.slug,
        status=body.status,
    )
    db.add(tenant)
    await db.flush()
    await audit.record(
        db,
        tenant_id=tenant.id,
        user_id=admin.user_id,
        action="org.create",
        resource_type="tenant",
        resource_id=tenant.id,
        after={"name": tenant.name, "slug": tenant.slug, "status": tenant.status},
    )
    await db.commit()
    await db.refresh(tenant)
    logger.info("org_created", tenant_id=str(tenant.id), slug=tenant.slug)
    return OrgResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        status=tenant.status,
        userCount=0,
        createdAt=tenant.created_at,
    )


@router.patch("/{org_id}", response_model=OrgResponse)
async def update_organization(
    org_id: uuid.UUID,
    body: UpdateOrgRequest,
    admin: CurrentUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> OrgResponse:
    tenant = await _load_tenant(db, org_id)
    before = {"name": tenant.name, "status": tenant.status}
    if body.name is not None:
        tenant.name = body.name
    if body.status is not None:
        tenant.status = body.status
    await audit.record(
        db,
        tenant_id=tenant.id,
        user_id=admin.user_id,
        action="org.update",
        resource_type="tenant",
        resource_id=tenant.id,
        before=before,
        after={"name": tenant.name, "status": tenant.status},
    )
    await db.commit()
    await db.refresh(tenant)
    return OrgResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        status=tenant.status,
        userCount=0,
        createdAt=tenant.created_at,
    )


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: uuid.UUID,
    admin: CurrentUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    tenant = await _load_tenant(db, org_id)
    tenant.deleted_at = datetime.now(UTC)
    tenant.deleted_by = admin.user_id
    await audit.record(
        db,
        tenant_id=tenant.id,
        user_id=admin.user_id,
        action="org.delete",
        resource_type="tenant",
        resource_id=tenant.id,
        before={"name": tenant.name, "slug": tenant.slug},
    )
    await db.commit()


@router.get("/{org_id}/users")
async def list_org_users(
    org_id: uuid.UUID,
    _admin: CurrentUser = Depends(require_platform_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:  # type: ignore[type-arg]
    await _load_tenant(db, org_id)
    result = await db.execute(
        select(User).where(User.tenant_id == org_id).order_by(User.created_at.asc())
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "displayName": u.display_name,
            "status": u.status,
        }
        for u in users
    ]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_tenant(db: AsyncSession, org_id: uuid.UUID) -> Tenant:
    t = await db.get(Tenant, org_id)
    if t is None or t.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )
    return t
