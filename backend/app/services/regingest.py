"""Server-side URL and file ingestion for RegIngest.

Pipeline:
1. Fetch the URL with httpx (or accept raw file bytes).
2. If the content-type is HTML, strip boilerplate and pull main content.
3. If the content-type is PDF, extract text via pypdf (Azure Document Intelligence
   is the production upgrade path).
4. Delegate to :func:`app.services.ingest.ingest_text` for chunking + embeddings.
"""

from __future__ import annotations

import uuid
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Document
from app.services.ingest import ingest_text

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
) -> tuple[str, str | None, str | None]:
    """Return ``(text, content_type, title)`` for the document at ``url``.

    Raises ``NotImplementedError`` for PDFs (Phase 4) and ``httpx.HTTPError``
    for transport failures.
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
            return _extract_pdf_text(resp.content), content_type, None

        if "html" in ct_lower or "xml" in ct_lower or "<html" in resp.text[:2000].lower():
            text, title = _extract_main_text(resp.text)
            return text, content_type, title

        # Plain text or unknown text/* — return as-is
        return resp.text, content_type, None
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
    """Fetch ``source_url``, extract clean text, ingest into the RAG store."""
    text, content_type, fetched_title = await fetch_url_content(source_url, http_client=http_client)
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

    document = await ingest_text(
        db=db,
        tenant_id=tenant_id,
        title=final_title,
        text=text,
        source_type="url",
        state_code=state_code,
        lob=lob,
        source_url=source_url,
    )
    return document


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF using pypdf.

    Falls back gracefully if pypdf is not installed or parsing fails.
    """
    try:
        import io

        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages: list[str] = []
        for page in reader.pages:
            try:
                pages.append(page.extract_text() or "")
            except Exception:
                pages.append("")
        return "\n\n".join(p for p in pages if p.strip())
    except ImportError:
        logger.warning("pypdf_not_installed", hint="pip install pypdf")
        return ""
    except Exception as exc:
        logger.warning("pdf_extract_failed", error=str(exc))
        return ""


async def ingest_pdf_bytes(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    filename: str,
    pdf_bytes: bytes,
    state_code: str | None = None,
    lob: str | None = None,
) -> Document:
    """Ingest a PDF file by extracting its text and feeding it to the RAG store."""
    text = _extract_pdf_text(pdf_bytes)
    if not text.strip():
        raise ValueError(f"No extractable text in PDF: {filename}")

    title = filename.rsplit("/", 1)[-1][:512]
    logger.info("regingest_pdf", filename=filename, text_length=len(text))
    return await ingest_text(
        db=db,
        tenant_id=tenant_id,
        title=title,
        text=text,
        source_type="pdf",
        state_code=state_code,
        lob=lob,
    )


def _fallback_title(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/").rsplit("/", 1)[-1] or parsed.netloc
    return path or url


__all__ = ["fetch_url_content", "ingest_from_url", "ingest_pdf_bytes"]
