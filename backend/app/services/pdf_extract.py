"""PDF text extraction with structure preservation.

Two parsers are tried in order:

1. **Docling** (IBM) — extracts the full document structure including
   tables, headings, lists, captions. Tables become Markdown so the
   downstream RAG pipeline keeps the row/column relationships intact.
   Required for regulatory bulletins where most rules live inside tables.

2. **pypdf** — fallback when Docling can't parse the file or isn't
   installed. Plain text only, no structure.

Both return ``(markdown_text, page_count)``. Callers should prefer the
returned text exactly as produced — the chunker treats Markdown headings
and tables as natural break points.
"""

from __future__ import annotations

import io
import tempfile
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)


def _extract_with_docling(pdf_bytes: bytes) -> tuple[str, int] | None:
    """Return ``(markdown, page_count)`` or ``None`` if Docling unavailable.

    Docling needs a path on disk (it streams the PDF page by page), so we
    write to a temp file. On any failure we log and return ``None`` so the
    caller can fall back to pypdf.
    """
    try:
        # Local import — keeps the API container slim. The worker image
        # installs the `docling` extra.
        from docling.document_converter import DocumentConverter
    except ImportError:
        logger.info("docling_not_installed", hint="pip install -e '.[docling]'")
        return None

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)

    try:
        converter = DocumentConverter()
        result = converter.convert(str(tmp_path))
        doc = result.document
        markdown = doc.export_to_markdown()
        # Docling page count lives on the document; defensive default to 0.
        page_count = len(doc.pages) if getattr(doc, "pages", None) else 0
        logger.info(
            "docling_extract_ok",
            pages=page_count,
            markdown_len=len(markdown),
        )
        return markdown, page_count
    except Exception as exc:
        logger.warning("docling_extract_failed", error=str(exc))
        return None
    finally:
        tmp_path.unlink(missing_ok=True)


def _extract_with_pypdf(pdf_bytes: bytes) -> tuple[str, int]:
    """Plain-text fallback. Always available — pypdf is a hard dependency."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    pages: list[str] = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    text = "\n\n".join(p for p in pages if p.strip())
    return text, len(reader.pages)


def extract_pdf_text(pdf_bytes: bytes) -> tuple[str, int]:
    """Best-effort extraction. Prefers Docling, falls back to pypdf.

    Returns ``(text, page_count)``. If both parsers fail the caller will
    see an empty string and should treat that as "no extractable text".
    """
    result = _extract_with_docling(pdf_bytes)
    if result is not None and result[0].strip():
        return result
    try:
        return _extract_with_pypdf(pdf_bytes)
    except Exception as exc:
        logger.warning("pypdf_extract_failed", error=str(exc))
        return "", 0


__all__ = ["extract_pdf_text"]
