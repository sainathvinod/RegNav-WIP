"""RegScout discovery-profile CRUD API.

Backs the Profiles page in the frontend — replaces the previous
in-memory Zustand store with tenant-scoped persistence and RLS.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import DiscoveryProfile

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    status: str
    configuration: dict[str, Any]
    sources: list[Any]
    metadata: dict[str, Any] = Field(..., alias="profileMetadata")
    tags: list[str]
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    model_config = {"from_attributes": True, "populate_by_name": True}

    @classmethod
    def from_orm_obj(cls, obj: DiscoveryProfile) -> "ProfileResponse":
        # Hand-build because the ORM column is named profile_metadata while
        # the response field is aliased to ``metadata`` for the API surface.
        return cls(
            id=obj.id,
            name=obj.name,
            description=obj.description,
            status=obj.status,
            configuration=obj.configuration or {},
            sources=obj.sources or [],
            profileMetadata=obj.profile_metadata or {},
            tags=obj.tags or [],
            createdAt=obj.created_at,
            updatedAt=obj.updated_at,
        )


class CreateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    status: str = Field(default="draft")
    configuration: dict[str, Any] = Field(default_factory=dict)
    sources: list[Any] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class UpdateProfileRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: str | None = None
    configuration: dict[str, Any] | None = None
    sources: list[Any] | None = None
    metadata: dict[str, Any] | None = None
    tags: list[str] | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[ProfileResponse])
async def list_profiles(
    _user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProfileResponse]:
    stmt = (
        select(DiscoveryProfile)
        .where(DiscoveryProfile.deleted_at.is_(None))
        .order_by(DiscoveryProfile.updated_at.desc())
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [ProfileResponse.from_orm_obj(p) for p in rows]


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    body: CreateProfileRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    profile = DiscoveryProfile(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        name=body.name,
        description=body.description,
        status=body.status,
        configuration=body.configuration,
        sources=body.sources,
        profile_metadata=body.metadata,
        tags=body.tags,
        created_by=user.user_id,
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    logger.info("profile_created", profile_id=str(profile.id), name=profile.name)
    return ProfileResponse.from_orm_obj(profile)


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: uuid.UUID,
    _user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    profile = await _load(db, profile_id)
    return ProfileResponse.from_orm_obj(profile)


@router.patch("/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: uuid.UUID,
    body: UpdateProfileRequest,
    _user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    profile = await _load(db, profile_id)
    data = body.model_dump(exclude_unset=True)
    # The API surface uses ``metadata``; the ORM column is profile_metadata.
    if "metadata" in data:
        profile.profile_metadata = data.pop("metadata") or {}
    for key, value in data.items():
        setattr(profile, key, value)
    profile.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(profile)
    return ProfileResponse.from_orm_obj(profile)


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    profile_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    profile = await _load(db, profile_id)
    profile.deleted_at = datetime.now(UTC)
    profile.deleted_by = user.user_id
    await db.commit()


async def _load(db: AsyncSession, profile_id: uuid.UUID) -> DiscoveryProfile:
    profile = await db.get(DiscoveryProfile, profile_id)
    if profile is None or profile.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
