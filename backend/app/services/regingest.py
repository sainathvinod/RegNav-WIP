"""Server-side URL and file ingestion for RegIngest.

Pipeline:
1. Fetch the URL with httpx (or accept raw file bytes).
2. If the content-type is HTML, strip boilerplate and pull main content;
   when ``archive_html_as_pdf`` is on, render the page to PDF and archive
   that to blob storage too.
3. If the content-type is PDF, extract structured text via Docling
   (preserves tables and headings as Markdown); pypdf is the fallback.
4. Delegate to :func:`app.services.ingest.ingest_text` for chunking,
   embeddings, and archive persistence.
"""

from __future__ import annotations

import uuid
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import Document
from app.services.html_pdf import render_html_to_pdf
from app.services.ingest import ingest_text
from app.services.pdf_extract import extract_pdf_text

logger = get_logger(__name__)


_DEFAULT_TIMEOUT = httpx.Timeout(60.0, connect=10.0)
_USER_AGENT = "RegNavBot/0.3 (+https://regnav.ai)"

_STRIP_TAGS = ("script", "style", "nav", "footer", "header", "aside", "noscript", "form")


def _extract_main_text(html: str) -> tuple[str, str | None]:
    """Return ``(clean_text, title)`` extracted from an HTML page."""
    soup = BeautifulSoup(html, "lxml")

    for tag_name in _STRIP_TAGS:
        for el in soup.find_all(tag_name):
            el.decompose()

    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = main.get_text("\n", strip=True) if main else ""
    # Collapse run-on blank lines
    cleaned = "\n".join(line for line in text.splitlines() if line.strip())
    return cleaned, title


async def fetch_url_content(
    url: str,
    *,
    http_client: httpx.AsyncClient | None = None,
) -> tuple[str, str | None, str | None, bytes | None]:
    """Return ``(text, content_type, title, raw_bytes)`` for ``url``.

    ``raw_bytes`` is the original payload, returned so the caller can
    archive it. For PDFs that's the source PDF; for HTML pages the worker
    re-renders the page to PDF separately (Playwright) since the raw HTML
    is generally not useful as an archival format.
    """
    own_client = http_client is None
    client = http_client or httpx.AsyncClient(
        timeout=_DEFAULT_TIMEOUT,
        headers={"User-Agent": _USER_AGENT},
        follow_redirects=True,
    )

    try:
        resp = await client.get(url)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type") or ""
        ct_lower = content_type.lower()

        if "pdf" in ct_lower or url.lower().endswith(".pdf"):
            text, _pages = extract_pdf_text(resp.content)
            return text, content_type, None, resp.content

        if "html" in ct_lower or "xml" in ct_lower or "<html" in resp.text[:2000].lower():
            text, title = _extract_main_text(resp.text)
            # Raw HTML is returned for completeness; the caller decides
            # whether to also produce a PDF render via render_html_to_pdf.
            return text, content_type, title, resp.text.encode("utf-8")

        # Plain text or unknown text/* — return as-is
        return resp.text, content_type, None, resp.content
    finally:
        if own_client:
            await client.aclose()


async def ingest_from_url(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    source_url: str,
    title: str | None = None,
    state_code: str | None = None,
    lob: str | None = None,
    http_client: httpx.AsyncClient | None = None,
) -> Document:
    """Fetch ``source_url``, extract clean text, archive, and ingest."""
    text, content_type, fetched_title, raw = await fetch_url_content(
        source_url, http_client=http_client
    )
    if not text.strip():
        raise ValueError(f"No extractable text at {source_url}")

    final_title = (title or fetched_title or _fallback_title(source_url))[:512]
    logger.info(
        "regingest_url_fetched",
        url=source_url,
        title=final_title,
        content_type=content_type,
        text_length=len(text),
    )

    archive_bytes: bytes | None = raw
    archive_ctype = content_type or "application/octet-stream"
    archive_ext = "bin"
    ct_lower = (content_type or "").lower()

    if "pdf" in ct_lower or source_url.lower().endswith(".pdf"):
        archive_ctype = "application/pdf"
        archive_ext = "pdf"
    elif "html" in ct_lower or "xml" in ct_lower:
        # Render HTML to PDF (best for archival) when configured.
        if settings.archive_html_as_pdf:
            pdf_render = await render_html_to_pdf(source_url)
            if pdf_render is not None:
                archive_bytes = pdf_render
                archive_ctype = "application/pdf"
                archive_ext = "pdf"
            else:
                # Fall back to storing the raw HTML so we still have an archive.
                archive_ctype = "text/html"
                archive_ext = "html"
        else:
            archive_ctype = "text/html"
            archive_ext = "html"

    document = await ingest_text(
        db=db,
        tenant_id=tenant_id,
        title=final_title,
        text=text,
        source_type="url",
        state_code=state_code,
        lob=lob,
        source_url=source_url,
        archive_bytes=archive_bytes,
        archive_content_type=archive_ctype,
        archive_extension=archive_ext,
    )
    return document


async def ingest_pdf_bytes(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    filename: str,
    pdf_bytes: bytes,
    state_code: str | None = None,
    lob: str | None = None,
    title: str | None = None,
) -> Document:
    """Ingest an uploaded PDF: Docling-extract its text, archive the bytes."""
    text, page_count = extract_pdf_text(pdf_bytes)
    if not text.strip():
        raise ValueError(f"No extractable text in PDF: {filename}")

    final_title = (title or filename.rsplit("/", 1)[-1])[:512]
    logger.info(
        "regingest_pdf",
        filename=filename,
        title=final_title,
        text_length=len(text),
        pages=page_count,
    )
    return await ingest_text(
        db=db,
        tenant_id=tenant_id,
        title=final_title,
        text=text,
        source_type="pdf",
        state_code=state_code,
        lob=lob,
        archive_bytes=pdf_bytes,
        archive_content_type="application/pdf",
        archive_extension="pdf",
    )


def _fallback_title(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/").rsplit("/", 1)[-1] or parsed.netloc
    return path or url


__all__ = ["fetch_url_content", "ingest_from_url", "ingest_pdf_bytes"]
