"""Health and readiness probes."""

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    env: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe. Returns 200 as long as the process is up."""
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        env=settings.app_env,
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=HealthResponse)
async def ready() -> HealthResponse:
    """Readiness probe.

    In Phase 1 this will additionally verify database + redis + key
    vault connectivity. For now it mirrors `/health`.
    """
    return HealthResponse(
        status="ready",
        app=settings.app_name,
        env=settings.app_env,
        timestamp=datetime.now(UTC),
    )
