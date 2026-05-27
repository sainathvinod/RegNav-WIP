"""Unit tests for the authentication middleware."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.auth import (
    DEV_ROLES,
    DEV_TENANT_ID,
    DEV_USER_ID,
    CurrentUser,
    get_current_user,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_request(auth_header: str | None = None):
    """Return a minimal mock Request with optional Authorization header."""
    request = MagicMock()
    headers: dict[str, str] = {}
    if auth_header is not None:
        headers["Authorization"] = auth_header
    request.headers = headers
    return request


def _make_db_session():
    """Return a mock AsyncSession."""
    session = AsyncMock()
    session.execute = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# Dev bypass tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dev_bypass_no_header() -> None:
    """No Authorization header in dev mode → synthetic platform_admin user."""
    request = _make_request(auth_header=None)
    db = _make_db_session()

    with patch("app.core.auth.settings") as mock_settings:
        mock_settings.app_env = "development"
        mock_settings.azure_ad_b2c_tenant = None
        mock_settings.jwt_audience = None
        mock_settings.jwt_algorithm = "RS256"

        user = await get_current_user(request=request, db=db)

    assert isinstance(user, CurrentUser)
    assert user.tenant_id == DEV_TENANT_ID
    assert user.user_id == DEV_USER_ID
    assert "platform_admin" in user.roles


@pytest.mark.asyncio
async def test_dev_bypass_explicit_header() -> None:
    """'Bearer dev-bypass' header in dev mode → synthetic user."""
    request = _make_request(auth_header="Bearer dev-bypass")
    db = _make_db_session()

    with patch("app.core.auth.settings") as mock_settings:
        mock_settings.app_env = "development"
        mock_settings.azure_ad_b2c_tenant = None
        mock_settings.jwt_audience = None
        mock_settings.jwt_algorithm = "RS256"

        user = await get_current_user(request=request, db=db)

    assert user.roles == list(DEV_ROLES)
    assert user.email == "dev@localhost"


# ---------------------------------------------------------------------------
# Production mode — missing / invalid auth
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_auth_header_prod_raises_401() -> None:
    """Missing Authorization header in production mode → 401."""
    request = _make_request(auth_header=None)
    db = _make_db_session()

    with patch("app.core.auth.settings") as mock_settings:
        mock_settings.app_env = "production"
        mock_settings.azure_ad_b2c_tenant = "https://example.b2clogin.com/example.onmicrosoft.com"
        mock_settings.jwt_audience = "my-audience"
        mock_settings.jwt_algorithm = "RS256"

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request=request, db=db)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_invalid_bearer_token_raises_401() -> None:
    """Invalid JWT token → 401."""
    request = _make_request(auth_header="Bearer not-a-real-jwt")
    db = _make_db_session()

    with (
        patch("app.core.auth.settings") as mock_settings,
        patch("app.core.auth._fetch_jwks", new_callable=AsyncMock) as mock_jwks,
    ):
        mock_settings.app_env = "production"
        mock_settings.azure_ad_b2c_tenant = "https://example.b2clogin.com/example.onmicrosoft.com"
        mock_settings.jwt_audience = "my-audience"
        mock_settings.jwt_algorithm = "RS256"
        mock_jwks.return_value = []  # empty JWKS triggers JWTError

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request=request, db=db)

    assert exc_info.value.status_code == 401
