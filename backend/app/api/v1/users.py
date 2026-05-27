"""User management API — invite, list, update, remove, role assignment."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user, require_role
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import Role, User, UserRole
from app.services import audit

logger = get_logger(__name__)

router = APIRouter()

# Standard role catalogue. Assignable through the API; auto-created on first use.
STANDARD_ROLES: set[str] = {
    "platform_admin",
    "tenant_owner",
    "compliance_admin",
    "compliance_lead",
    "analyst",
    "viewer",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID = Field(..., alias="tenantId")
    email: str
    display_name: str = Field(..., alias="displayName")
    status: str
    roles: list[str]
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class CurrentUserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID = Field(..., alias="tenantId")
    email: str | None
    roles: list[str]

    model_config = {"populate_by_name": True}


class InviteUserRequest(BaseModel):
    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=255, alias="displayName")
    roles: list[str] = Field(default_factory=lambda: ["analyst"])

    model_config = {"populate_by_name": True}


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(
        default=None, min_length=1, max_length=255, alias="displayName"
    )
    status: str | None = None

    model_config = {"populate_by_name": True}


class AssignRoleRequest(BaseModel):
    role: str = Field(..., min_length=1, max_length=64)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user_info(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUserResponse:
    """Return information about the currently authenticated user."""
    return CurrentUserResponse(
        id=user.user_id,
        tenantId=user.tenant_id,
        email=user.email,
        roles=user.roles,
    )


@router.get("", response_model=list[UserResponse])
async def list_users(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    """List users in the current tenant."""
    stmt = (
        select(User)
        .where(User.tenant_id == user.tenant_id, User.deleted_at.is_(None))
        .order_by(User.created_at.asc())
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    out: list[UserResponse] = []
    for u in users:
        roles = await _load_user_roles(db, u.id)
        out.append(
            UserResponse(
                id=u.id,
                tenantId=u.tenant_id,
                email=u.email,
                displayName=u.display_name,
                status=u.status,
                roles=roles,
                createdAt=u.created_at,
            )
        )
    return out


@router.post(
    "/invite",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_user(
    body: InviteUserRequest,
    actor: CurrentUser = Depends(
        require_role("tenant_owner", "platform_admin", "compliance_admin")
    ),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Invite a new user to the current tenant.

    The user lands in ``status=invited``. They become ``active`` after their
    first successful Azure AD B2C sign-in; the auth middleware will then
    upsert ``external_id`` and flip the status.
    """
    # Check for duplicate email in tenant
    existing = await db.execute(
        select(User).where(
            User.tenant_id == actor.tenant_id,
            User.email == body.email,
            User.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{body.email}' already exists in this tenant",
        )

    # Validate role names
    invalid_roles = set(body.roles) - STANDARD_ROLES
    if invalid_roles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown roles: {sorted(invalid_roles)}",
        )

    new_user = User(
        id=uuid.uuid4(),
        tenant_id=actor.tenant_id,
        email=str(body.email),
        external_id=f"pending-{uuid.uuid4().hex[:12]}",
        display_name=body.display_name,
        status="invited",
    )
    db.add(new_user)
    await db.flush()

    for role_name in body.roles:
        await _assign_role(db, new_user.id, actor.tenant_id, role_name, actor.user_id)

    await audit.record(
        db,
        tenant_id=actor.tenant_id,
        user_id=actor.user_id,
        action="user.invite",
        resource_type="user",
        resource_id=new_user.id,
        after={
            "email": new_user.email,
            "display_name": new_user.display_name,
            "roles": body.roles,
        },
    )
    await db.commit()
    await db.refresh(new_user)

    logger.info(
        "user_invited",
        tenant_id=str(actor.tenant_id),
        user_id=str(new_user.id),
        email=new_user.email,
    )

    return UserResponse(
        id=new_user.id,
        tenantId=new_user.tenant_id,
        email=new_user.email,
        displayName=new_user.display_name,
        status=new_user.status,
        roles=body.roles,
        createdAt=new_user.created_at,
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UpdateUserRequest,
    actor: CurrentUser = Depends(
        require_role("tenant_owner", "platform_admin", "compliance_admin")
    ),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    target = await _load_user(db, user_id, actor.tenant_id)
    before = {"display_name": target.display_name, "status": target.status}
    if body.display_name is not None:
        target.display_name = body.display_name
    if body.status is not None:
        target.status = body.status

    await audit.record(
        db,
        tenant_id=actor.tenant_id,
        user_id=actor.user_id,
        action="user.update",
        resource_type="user",
        resource_id=target.id,
        before=before,
        after={"display_name": target.display_name, "status": target.status},
    )
    await db.commit()
    await db.refresh(target)
    roles = await _load_user_roles(db, target.id)
    return UserResponse(
        id=target.id,
        tenantId=target.tenant_id,
        email=target.email,
        displayName=target.display_name,
        status=target.status,
        roles=roles,
        createdAt=target.created_at,
    )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user(
    user_id: uuid.UUID,
    actor: CurrentUser = Depends(require_role("tenant_owner", "platform_admin")),
    db: AsyncSession = Depends(get_db),
) -> None:
    target = await _load_user(db, user_id, actor.tenant_id)
    if target.id == actor.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own account",
        )
    target.deleted_at = datetime.now(UTC)
    target.deleted_by = actor.user_id
    target.status = "removed"
    await audit.record(
        db,
        tenant_id=actor.tenant_id,
        user_id=actor.user_id,
        action="user.remove",
        resource_type="user",
        resource_id=target.id,
        before={"email": target.email},
    )
    await db.commit()


@router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_role(
    user_id: uuid.UUID,
    body: AssignRoleRequest,
    actor: CurrentUser = Depends(
        require_role("tenant_owner", "platform_admin", "compliance_admin")
    ),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    if body.role not in STANDARD_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown role: {body.role}",
        )
    target = await _load_user(db, user_id, actor.tenant_id)
    await _assign_role(db, target.id, actor.tenant_id, body.role, actor.user_id)
    await audit.record(
        db,
        tenant_id=actor.tenant_id,
        user_id=actor.user_id,
        action="user.role.assign",
        resource_type="user",
        resource_id=target.id,
        after={"role": body.role},
    )
    await db.commit()
    roles = await _load_user_roles(db, target.id)
    return UserResponse(
        id=target.id,
        tenantId=target.tenant_id,
        email=target.email,
        displayName=target.display_name,
        status=target.status,
        roles=roles,
        createdAt=target.created_at,
    )


@router.delete("/{user_id}/roles/{role_name}", response_model=UserResponse)
async def revoke_role(
    user_id: uuid.UUID,
    role_name: str,
    actor: CurrentUser = Depends(
        require_role("tenant_owner", "platform_admin", "compliance_admin")
    ),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    target = await _load_user(db, user_id, actor.tenant_id)
    # Look up the Role row
    role_result = await db.execute(
        select(Role).where(Role.tenant_id == actor.tenant_id, Role.name == role_name)
    )
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not assigned in this tenant",
        )
    # Delete the UserRole link
    link_result = await db.execute(
        select(UserRole).where(UserRole.user_id == target.id, UserRole.role_id == role.id)
    )
    link = link_result.scalar_one_or_none()
    if link is not None:
        await db.delete(link)
    await audit.record(
        db,
        tenant_id=actor.tenant_id,
        user_id=actor.user_id,
        action="user.role.revoke",
        resource_type="user",
        resource_id=target.id,
        before={"role": role_name},
    )
    await db.commit()
    roles = await _load_user_roles(db, target.id)
    return UserResponse(
        id=target.id,
        tenantId=target.tenant_id,
        email=target.email,
        displayName=target.display_name,
        status=target.status,
        roles=roles,
        createdAt=target.created_at,
    )


@router.get("/roles/available", response_model=list[str])
async def list_available_roles(
    _user: CurrentUser = Depends(get_current_user),
) -> list[str]:
    """Return the canonical list of role names for assignment."""
    return sorted(STANDARD_ROLES)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _load_user(db: AsyncSession, user_id: uuid.UUID, tenant_id: uuid.UUID) -> User:
    u = await db.get(User, user_id)
    if u is None or u.deleted_at is not None or u.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return u


async def _load_user_roles(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    """Return role names assigned to a user."""
    result = await db.execute(
        select(Role).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user_id)
    )
    return sorted(r.name for r in result.scalars().all())


async def _assign_role(
    db: AsyncSession,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    role_name: str,
    granted_by: uuid.UUID | None,
) -> None:
    """Idempotent role assignment. Creates the Role row if needed."""
    role_result = await db.execute(
        select(Role).where(Role.tenant_id == tenant_id, Role.name == role_name)
    )
    role = role_result.scalar_one_or_none()
    if role is None:
        role = Role(id=uuid.uuid4(), tenant_id=tenant_id, name=role_name)
        db.add(role)
        await db.flush()

    # Skip if already assigned
    existing = await db.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
    )
    if existing.scalar_one_or_none() is not None:
        return

    link = UserRole(user_id=user_id, role_id=role.id, granted_by_id=granted_by)
    db.add(link)
