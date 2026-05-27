"""Tenant Configuration API — per-tenant LLM and RAG settings."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.config import settings
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import TenantConfig

logger = get_logger(__name__)

router = APIRouter()

# Keys that tenants are allowed to override
ALLOWED_KEYS: set[str] = {
    "chat_model",
    "embedding_model",
    "rag_top_k",
    "rag_chunk_size",
    "rag_chunk_overlap",
    "default_state_code",
    "default_lob",
}

# System defaults for each key
_DEFAULTS: dict[str, str] = {
    "chat_model": settings.chat_model,
    "embedding_model": settings.embedding_model,
    "rag_top_k": str(settings.rag_top_k),
    "rag_chunk_size": str(settings.rag_chunk_size),
    "rag_chunk_overlap": str(settings.rag_chunk_overlap),
    "default_state_code": "",
    "default_lob": "",
}


class ConfigEntry(BaseModel):
    key: str
    value: str
    default: str
    is_overridden: bool


class ConfigResponse(BaseModel):
    entries: list[ConfigEntry]


class UpdateConfigRequest(BaseModel):
    updates: dict[str, str]


@router.get("", response_model=ConfigResponse)
async def get_config(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConfigResponse:
    """Return all config keys with their effective values and defaults."""
    overrides = await _load_overrides(db, user.tenant_id)
    entries = [
        ConfigEntry(
            key=k,
            value=overrides.get(k, default),
            default=default,
            is_overridden=k in overrides,
        )
        for k, default in _DEFAULTS.items()
    ]
    return ConfigResponse(entries=entries)


@router.patch("", response_model=ConfigResponse)
async def update_config(
    body: UpdateConfigRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConfigResponse:
    """Upsert tenant config overrides. Only allowed keys are accepted."""
    unknown = set(body.updates) - ALLOWED_KEYS
    if unknown:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown config keys: {sorted(unknown)}",
        )

    overrides = await _load_overrides(db, user.tenant_id)

    # Load existing rows for update
    existing_result = await db.execute(
        select(TenantConfig).where(TenantConfig.tenant_id == user.tenant_id)
    )
    existing_map: dict[str, TenantConfig] = {
        row.key: row for row in existing_result.scalars().all()
    }

    for key, value in body.updates.items():
        if key in existing_map:
            existing_map[key].value = value
            existing_map[key].updated_by = user.user_id
        else:
            db.add(
                TenantConfig(
                    id=uuid.uuid4(),
                    tenant_id=user.tenant_id,
                    key=key,
                    value=value,
                    updated_by=user.user_id,
                )
            )
        overrides[key] = value

    await db.commit()
    logger.info(
        "tenant_config_updated",
        tenant_id=str(user.tenant_id),
        keys=sorted(body.updates.keys()),
    )

    entries = [
        ConfigEntry(
            key=k,
            value=overrides.get(k, default),
            default=default,
            is_overridden=k in overrides,
        )
        for k, default in _DEFAULTS.items()
    ]
    return ConfigResponse(entries=entries)


@router.delete("/{key}", status_code=204)
async def reset_config_key(
    key: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Reset a single key to its system default by removing the override."""
    result = await db.execute(
        select(TenantConfig).where(
            TenantConfig.tenant_id == user.tenant_id,
            TenantConfig.key == key,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _load_overrides(
    db: AsyncSession, tenant_id: uuid.UUID
) -> dict[str, str]:
    result = await db.execute(
        select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
    )
    return {row.key: row.value for row in result.scalars().all()}
