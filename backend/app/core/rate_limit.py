"""Per-tenant rate limiting via Redis fixed-window counters.

Uses an INCR + EXPIRE pattern keyed on ``(tenant, endpoint_class, window)``.
Falls open if Redis is unavailable so an outage doesn't take the API down.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

import redis.asyncio as aioredis
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Per-endpoint-class limits (requests per 60-second window per tenant)
_LIMITS: dict[str, int] = {
    "chat": 120,        # /api/v1/rulesense/sessions/.../messages
    "validate": 60,     # /api/v1/regvalidate/validate
    "extract": 30,      # /api/v1/ruleminer/extract
    "default": 600,
}

_WINDOW_SECONDS = 60

_redis_client: aioredis.Redis | None = None


def _classify(path: str) -> str:
    if "/rulesense/sessions/" in path and path.endswith("/messages"):
        return "chat"
    if path.endswith("/regvalidate/validate"):
        return "validate"
    if path.endswith("/ruleminer/extract"):
        return "extract"
    return "default"


async def _get_redis() -> aioredis.Redis | None:
    """Lazily connect to Redis. Returns None if the connection fails."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        await client.ping()
        _redis_client = client
        return client
    except Exception as exc:
        logger.warning("rate_limit_redis_unavailable", error=str(exc))
        return None


async def rate_limit_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Enforce per-tenant request limits on hot endpoints."""
    # Only rate-limit API routes
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    # Identify the tenant — use the Authorization header as the key. For dev
    # bypass we use a fixed key so dev traffic shares one bucket.
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer dev-bypass"):
        tenant_key = "dev-bypass"
    elif auth.startswith("Bearer "):
        # Last 16 chars of the JWT — entropy without storing the whole token.
        tenant_key = auth[-16:]
    else:
        # Unauthenticated; let auth dependency reject it normally.
        return await call_next(request)

    endpoint_class = _classify(request.url.path)
    limit = _LIMITS.get(endpoint_class, _LIMITS["default"])
    window = int(time.time() // _WINDOW_SECONDS)
    key = f"rl:{tenant_key}:{endpoint_class}:{window}"

    redis = await _get_redis()
    if redis is None:
        # Fail-open if Redis is unreachable
        return await call_next(request)

    try:
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, _WINDOW_SECONDS)
    except Exception as exc:
        logger.warning("rate_limit_redis_failed", error=str(exc))
        return await call_next(request)

    if count > limit:
        retry_after = _WINDOW_SECONDS - int(time.time() % _WINDOW_SECONDS)
        logger.info(
            "rate_limit_exceeded",
            endpoint_class=endpoint_class,
            count=count,
            limit=limit,
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Rate limit exceeded ({limit}/min for {endpoint_class})",
            },
            headers={"Retry-After": str(retry_after)},
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
    return response
