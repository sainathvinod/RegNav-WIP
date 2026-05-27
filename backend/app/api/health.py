"""Health and readiness probes."""

from datetime import UTC, datetime

import redis.asyncio as aioredis
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import settings
from app.db.engine import AsyncSessionLocal

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    env: str
    timestamp: datetime


class ReadinessResponse(BaseModel):
    status: str
    app: str
    env: str
    timestamp: datetime
    checks: dict[str, str]


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe. Returns 200 as long as the process is up."""
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        env=settings.app_env,
        timestamp=datetime.now(UTC),
    )


@router.get("/ready", response_model=ReadinessResponse)
async def ready() -> ReadinessResponse:
    """Readiness probe — verifies database and Redis connectivity."""
    checks: dict[str, str] = {}
    overall_ok = True

    # --- Database --------------------------------------------------------
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc!s:.120}"
        overall_ok = False

    # --- Redis -----------------------------------------------------------
    try:
        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=3)
        await r.ping()
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc!s:.120}"
        overall_ok = False

    return ReadinessResponse(
        status="ready" if overall_ok else "degraded",
        app=settings.app_name,
        env=settings.app_env,
        timestamp=datetime.now(UTC),
        checks=checks,
    )
