"""RegScout discovery service.

The discovery flow is:

1. Fetch the source URL with httpx.
2. Run :func:`extract_candidate_links` to find likely doc URLs.
3. HEAD each candidate to get its content-type.
4. Insert (or no-op update) a ``DiscoveredDocument`` row.
5. Stamp the ``RegulatorySource`` row with the final status.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import DiscoveredDocument, RegulatorySource
from app.services.regscout_rules import extract_candidate_links

logger = get_logger(__name__)


_DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_USER_AGENT = "RegNavBot/0.3 (+https://regnav.ai)"
_HEAD_CONCURRENCY = 6


ProgressFn = Callable[[int, str | None], Awaitable[None]]


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _classify_status(exc: BaseException | None, status_code: int | None) -> str:
    if isinstance(exc, httpx.TimeoutException):
        return "timeout"
    if isinstance(exc, httpx.HTTPError):
        return "5xx"
    if isinstance(exc, Exception):
        return "parse_error"
    if status_code is None:
        return "parse_error"
    if 200 <= status_code < 300:
        return "ok"
    if status_code == 404:
        return "404"
    if status_code >= 500:
        return "5xx"
    return str(status_code)


async def _head_candidate(
    client: httpx.AsyncClient,
    url: str,
) -> tuple[str | None, int | None]:
    """Return (content_type, status_code) for the candidate link."""
    try:
        resp = await client.head(url, follow_redirects=True)
        if resp.status_code == 405:
            # Some servers reject HEAD — fall back to a tiny GET.
            resp = await client.get(url, follow_redirects=True)
        content_type = resp.headers.get("content-type")
        return content_type, resp.status_code
    except httpx.HTTPError as exc:
        logger.debug("regscout_head_failed", url=url, error=str(exc))
        return None, None


async def discover_from_source(
    db: AsyncSession,
    source: RegulatorySource,
    progress: ProgressFn | None = None,
    *,
    http_client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Crawl ``source.url`` for new candidate documents.

    Returns a dict ``{'discovered': N, 'new': N, 'failed': N}``.
    Updates the source row's ``last_*`` columns inside this session.
    """
    own_client = http_client is None
    client = http_client or httpx.AsyncClient(
        timeout=_DEFAULT_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
        follow_redirects=True,
    )

    discovered = 0
    new_count = 0
    failed = 0
    final_status = "ok"
    error_text: str | None = None

    try:
        if progress is not None:
            await progress(5, f"Fetching {source.name}")

        try:
            resp = await client.get(source.url)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            error_text = str(exc)
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            final_status = _classify_status(exc, status_code)
            logger.warning(
                "regscout_fetch_failed",
                source_id=str(source.id),
                url=source.url,
                error=error_text,
            )
            source.last_checked_at = _utcnow()
            source.last_status = final_status
            source.last_error = error_text[:2000]
            await db.flush()
            return {"discovered": 0, "new": 0, "failed": 1, "status": final_status}

        html = resp.text
        candidates = extract_candidate_links(html, source.url, source.source_type)
        discovered = len(candidates)
        logger.info(
            "regscout_links_found",
            source_id=str(source.id),
            url=source.url,
            count=discovered,
        )

        if progress is not None:
            await progress(20, f"Found {discovered} candidate links")

        if not candidates:
            source.last_checked_at = _utcnow()
            source.last_status = "ok"
            source.last_error = None
            source.discovered_doc_count = 0
            await db.flush()
            return {"discovered": 0, "new": 0, "failed": 0, "status": "ok"}

        # HEAD each candidate with limited concurrency
        sem = asyncio.Semaphore(_HEAD_CONCURRENCY)

        async def _resolve(cand: dict[str, str]) -> tuple[dict[str, str], str | None, int | None]:
            async with sem:
                ct, sc = await _head_candidate(client, cand["url"])
                return cand, ct, sc

        results = await asyncio.gather(*[_resolve(c) for c in candidates])

        # Bulk-load existing URLs for this tenant in one query
        urls = [c["url"] for c, *_ in results]
        existing_q = await db.execute(
            select(DiscoveredDocument.url).where(
                DiscoveredDocument.tenant_id == source.tenant_id,
                DiscoveredDocument.url.in_(urls),
            )
        )
        existing_urls: set[str] = {row[0] for row in existing_q.all()}

        if progress is not None:
            await progress(60, f"Validating {discovered} links")

        for cand, content_type, status_code in results:
            if status_code is None:
                failed += 1
                continue
            if status_code >= 400:
                failed += 1
                continue
            if cand["url"] in existing_urls:
                continue

            doc = DiscoveredDocument(
                id=uuid.uuid4(),
                tenant_id=source.tenant_id,
                source_id=source.id,
                url=cand["url"],
                title=cand["title"],
                content_type=content_type,
                status="pending",
            )
            db.add(doc)
            existing_urls.add(cand["url"])
            new_count += 1

        if progress is not None:
            await progress(90, f"Saving {new_count} new documents")

        source.last_checked_at = _utcnow()
        source.last_status = "ok"
        source.last_error = None
        source.discovered_doc_count = (source.discovered_doc_count or 0) + new_count
        await db.flush()
        return {
            "discovered": discovered,
            "new": new_count,
            "failed": failed,
            "status": "ok",
        }

    except Exception as exc:
        error_text = str(exc)
        final_status = "parse_error"
        logger.exception("regscout_unexpected_failure", source_id=str(source.id))
        source.last_checked_at = _utcnow()
        source.last_status = final_status
        source.last_error = error_text[:2000]
        await db.flush()
        return {
            "discovered": discovered,
            "new": new_count,
            "failed": failed + 1,
            "status": final_status,
        }
    finally:
        if own_client:
            await client.aclose()


__all__ = ["discover_from_source"]
