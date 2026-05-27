"""Anthropic Messages API streaming client.

Yields normalized events of the form:
    {"type": "token", "text": "..."}
    {"type": "done", "usage": {"input_tokens": int, "output_tokens": int}}
    {"type": "error", "message": "..."}
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

from app.core.logging import get_logger
from app.llm.credentials import get_anthropic_api_key

logger = get_logger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


async def stream_chat(
    messages: list[dict[str, str]],
    system: str,
    model: str,
    max_tokens: int = 2048,
) -> AsyncIterator[dict[str, Any]]:
    """Stream a chat completion from Anthropic.

    `messages` is a list of {role, content} dicts (no system message in here —
    Anthropic takes `system` as a top-level field).
    """
    api_key = await get_anthropic_api_key()

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "system": system,
        "max_tokens": max_tokens,
        "stream": True,
    }

    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    usage: dict[str, int] = {"input_tokens": 0, "output_tokens": 0}

    async with (
        httpx.AsyncClient(timeout=120.0) as client,
        client.stream(
            "POST",
            ANTHROPIC_API_URL,
            json=payload,
            headers=headers,
        ) as response,
    ):
        if response.status_code >= 400:
            body = await response.aread()
            logger.warning(
                "anthropic_stream_upstream_error",
                status=response.status_code,
                body=body.decode(errors="replace")[:500],
            )
            yield {
                "type": "error",
                "message": f"Anthropic API returned {response.status_code}",
            }
            return

        current_event: str | None = None
        async for raw_line in response.aiter_lines():
            if not raw_line:
                current_event = None
                continue

            if raw_line.startswith("event:"):
                current_event = raw_line[len("event:") :].strip()
                continue

            if not raw_line.startswith("data:"):
                continue

            data_str = raw_line[len("data:") :].strip()
            if not data_str:
                continue

            try:
                data = json.loads(data_str)
            except json.JSONDecodeError:
                continue

            event_type = current_event or data.get("type")

            if event_type == "content_block_delta":
                delta = data.get("delta") or {}
                if delta.get("type") == "text_delta":
                    text = delta.get("text", "")
                    if text:
                        yield {"type": "token", "text": text}

            elif event_type == "message_start":
                msg = data.get("message") or {}
                msg_usage = msg.get("usage") or {}
                usage["input_tokens"] = int(msg_usage.get("input_tokens") or 0)

            elif event_type == "message_delta":
                delta_usage = data.get("usage") or {}
                if "output_tokens" in delta_usage:
                    usage["output_tokens"] = int(delta_usage["output_tokens"])

            elif event_type == "message_stop":
                break

            elif event_type == "error":
                err = data.get("error") or {}
                yield {
                    "type": "error",
                    "message": err.get("message") or "Unknown Anthropic error",
                }
                return

    yield {"type": "done", "usage": usage}
