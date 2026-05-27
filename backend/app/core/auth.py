"""JWT authentication middleware and FastAPI dependencies.

Two operating modes:
- Development: synthetic user injected when no/dev-bypass token present
- Production: Azure AD B2C JWT validated against JWKS endpoint
"""

import time
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.rls import set_tenant_guc

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEV_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000002")
DEV_ROLES = ["platform_admin"]

# JWKS cache: maps issuer URL -> {"keys": [...], "expires_at": float}
_jwks_cache: dict[str, dict[str, Any]] = {}
_JWKS_TTL = 86_400  # 24 hours


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CurrentUser:
    tenant_id: UUID
    user_id: UUID
    roles: list[str]
    email: str | None = None
    extra_claims: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# JWKS helpers
# ---------------------------------------------------------------------------


async def _fetch_jwks(jwks_url: str) -> list[dict[str, Any]]:
    """Fetch and cache JWKS keys with a 24-hour TTL."""
    now = time.time()
    cached = _jwks_cache.get(jwks_url)
    if cached and cached["expires_at"] > now:
        return cached["keys"]  # type: ignore[return-value]

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        data = resp.json()

    keys: list[dict[str, Any]] = data.get("keys", [])
    _jwks_cache[jwks_url] = {"keys": keys, "expires_at": now + _JWKS_TTL}
    logger.info("jwks_refreshed", url=jwks_url, key_count=len(keys))
    return keys


def _build_jwks_url() -> str | None:
    tenant = settings.azure_ad_b2c_tenant
    if not tenant:
        return None
    return f"{tenant.rstrip('/')}/.well-known/keys"


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------


async def _validate_token(token: str) -> dict[str, Any]:
    """Validate JWT and return claims dict."""
    jwks_url = _build_jwks_url()
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth not configured — set AZURE_AD_B2C_TENANT",
        )

    try:
        keys = await _fetch_jwks(jwks_url)
        # python-jose can accept the JWKS dict directly
        claims: dict[str, Any] = jwt.decode(
            token,
            {"keys": keys},
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            options={"verify_aud": bool(settings.jwt_audience)},
        )
        return claims
    except JWTError as exc:
        logger.warning("jwt_validation_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Resolve the current user from the Authorization header.

    In development mode with no / dev-bypass header, a synthetic platform
    admin user is injected so the API works without a real IdP.
    """
    auth_header: str | None = request.headers.get("Authorization")
    is_dev = settings.app_env == "development"

    # ---- Dev bypass -------------------------------------------------------
    if is_dev and (auth_header is None or auth_header == "Bearer dev-bypass"):
        user = CurrentUser(
            tenant_id=DEV_TENANT_ID,
            user_id=DEV_USER_ID,
            roles=list(DEV_ROLES),
            email="dev@localhost",
        )
        await set_tenant_guc(db, user.tenant_id)
        return user

    # ---- Production JWT ---------------------------------------------------
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.removeprefix("Bearer ").strip()
    claims = await _validate_token(token)

    # Extract standard claims
    sub: str | None = claims.get("sub")
    # Azure AD B2C uses "tid" or custom "tenant_id" claim
    raw_tenant: str | None = claims.get("tid") or claims.get("tenant_id")
    roles: list[str] = claims.get("roles", [])
    email: str | None = claims.get("email") or claims.get("emails", [None])[0]

    if not sub or not raw_tenant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing required claims (sub, tid/tenant_id)",
        )

    try:
        user_id = UUID(sub)
        tenant_id = UUID(raw_tenant)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token claims contain invalid UUID values",
        ) from exc

    user = CurrentUser(
        tenant_id=tenant_id,
        user_id=user_id,
        roles=roles,
        email=email,
        extra_claims={
            k: v
            for k, v in claims.items()
            if k not in {"sub", "tid", "tenant_id", "roles", "email", "emails"}
        },
    )
    await set_tenant_guc(db, user.tenant_id)
    return user


async def require_platform_admin(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Dependency that enforces the platform_admin role."""
    if "platform_admin" not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="platform_admin role required",
        )
    return user


def require_role(*roles: str):
    """Factory that returns a dependency enforcing any of the given roles."""

    async def _dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not any(r in user.roles for r in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of the following roles required: {', '.join(roles)}",
            )
        return user

    return _dependency
