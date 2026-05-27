"""Health-check endpoints for LLM provider connectivity.

GET /api/v1/health/llm  — tests both Anthropic and OpenAI in one request.
Useful for operators to verify credentials are wired correctly after
deploying the app or rotating keys.

The endpoint is intentionally lightweight:
  • Anthropic: sends a single-token "ping" message.
  • OpenAI:    embeds a short string and checks the vector is non-empty.

Auth: requires a valid bearer token (dev-bypass works in development).
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.llm.anthropic_chat import stream_chat
from app.llm.embeddings import EmbeddingClient

router = APIRouter()


async def _ping_anthropic() -> dict[str, Any]:
    start = time.monotonic()
    collected = ""
    error: str | None = None

    try:
        async for event in stream_chat(
            messages=[{"role": "user", "content": "Reply with one word: OK"}],
            system="You are a health-check assistant. Reply with exactly one word.",
            model="claude-haiku-4-5-20251001",
            max_tokens=8,
        ):
            if event["type"] == "token":
                collected += event["text"]
            elif event["type"] == "error":
                error = event["message"]
    except Exception as exc:
        error = str(exc)

    latency_ms = round((time.monotonic() - start) * 1000)
    ok = bool(collected.strip()) and error is None
    return {
        "ok": ok,
        "latency_ms": latency_ms,
        **({"error": error} if error else {}),
    }


async def _ping_openai() -> dict[str, Any]:
    start = time.monotonic()
    error: str | None = None
    dimensions = 0

    try:
        client = EmbeddingClient()
        vector = await client.embed_single("health check")
        dimensions = len(vector)
    except Exception as exc:
        error = str(exc)

    latency_ms = round((time.monotonic() - start) * 1000)
    ok = dimensions > 0 and error is None
    return {
        "ok": ok,
        "latency_ms": latency_ms,
        "dimensions": dimensions if ok else None,
        **({"error": error} if error else {}),
    }


@router.get("/llm")
async def llm_health(
    _user: CurrentUser = Depends(get_current_user),
) -> dict[str, Any]:
    """Check connectivity to Anthropic (chat) and OpenAI (embeddings).

    Both checks run concurrently. Returns HTTP 200 with `overall: true/false`
    so callers can inspect individual provider results without treating a
    partial failure as an unrecoverable error.
    """
    import asyncio

    anthropic_result, openai_result = await asyncio.gather(
        _ping_anthropic(),
        _ping_openai(),
    )

    overall = anthropic_result["ok"] and openai_result["ok"]
    return {
        "overall": overall,
        "providers": {
            "anthropic": anthropic_result,
            "openai": openai_result,
        },
    }
