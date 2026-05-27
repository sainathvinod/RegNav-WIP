"""User endpoints (v1)."""

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import CurrentUser, get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str | None
    roles: list[str]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: CurrentUser = Depends(get_current_user),
) -> UserResponse:
    """Return information about the currently authenticated user."""
    return UserResponse(
        id=user.user_id,
        tenant_id=user.tenant_id,
        email=user.email,
        roles=user.roles,
    )
