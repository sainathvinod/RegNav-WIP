"""LLM proxy endpoint — replaces the legacy Node.js proxy-server.js.

The API key is NEVER accepted from the request body. It is fetched from:
  1. Azure Key Vault (if AZURE_KEYVAULT_URL is set) — secret name: anthropic-api-key
  2. Environment variable ANTHROPIC_API_KEY

The frontend sends the user's JWT in the Authorization header; this
endpoint validates it and attaches tenant context before forwarding.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.llm.credentials import get_anthropic_api_key

logger = get_logger(__name__)

router = APIRouter()

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AnthropicMessage(BaseModel):
    role: str
    content: str


class LLMProxyRequest(BaseModel):
    model: str
    messages: list[AnthropicMessage]
    max_tokens: int = 1024
    temperature: float | None = None
    top_p: float | None = None


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("/anthropic")
async def proxy_anthropic(
    body: LLMProxyRequest,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Forward a chat request to the Anthropic Messages API.

    The API key is resolved server-side; clients must NOT send it.
    """
    api_key = await get_anthropic_api_key()

    payload: dict = {
        "model": body.model,
        "messages": [m.model_dump() for m in body.messages],
        "max_tokens": body.max_tokens,
    }
    if body.temperature is not None:
        payload["temperature"] = body.temperature
    if body.top_p is not None:
        payload["top_p"] = body.top_p

    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
    except httpx.RequestError as exc:
        logger.error("anthropic_request_error", error=str(exc), tenant_id=str(user.tenant_id))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to reach Anthropic API: {exc}",
        ) from exc

    if not resp.is_success:
        logger.warning(
            "anthropic_upstream_error",
            status=resp.status_code,
            tenant_id=str(user.tenant_id),
        )
        raise HTTPException(
            status_code=resp.status_code,
            detail=resp.text,
        )

    data: dict = resp.json()

    # Log token usage with tenant context
    usage = data.get("usage", {})
    logger.info(
        "llm_tokens_used",
        tenant_id=str(user.tenant_id),
        user_id=str(user.user_id),
        model=body.model,
        input_tokens=usage.get("input_tokens"),
        output_tokens=usage.get("output_tokens"),
    )

    return data
