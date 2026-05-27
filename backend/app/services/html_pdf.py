"""Render an HTML page to PDF for archival.

Uses Playwright Chromium under the hood so JavaScript-driven pages render
the same as a human would see them. Playwright is only installed in the
worker image (``htmlpdf`` extra) — the API image does not need it. When
the dependency or browser binaries are missing we log and return None so
the calling pipeline degrades to "no PDF render" rather than failing
ingestion.
"""

from __future__ import annotations

from app.core.logging import get_logger

logger = get_logger(__name__)


async def render_html_to_pdf(url: str, *, timeout_ms: int = 20_000) -> bytes | None:
    """Return the PDF bytes for ``url`` or ``None`` if rendering isn't available.

    Errors during rendering — playwright not installed, browser missing,
    page failed to load — are swallowed and reported as ``None`` so the
    surrounding ingest job can still complete with HTML-as-archive.
    """
    try:
        # Import lazily; Playwright is a heavyweight dependency.
        from playwright.async_api import async_playwright
    except ImportError:
        logger.info(
            "playwright_not_installed",
            hint="pip install -e '.[htmlpdf]' && playwright install chromium",
        )
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=["--no-sandbox"])
            try:
                context = await browser.new_context()
                page = await context.new_page()
                await page.goto(url, wait_until="networkidle", timeout=timeout_ms)
                pdf_bytes = await page.pdf(
                    format="Letter",
                    print_background=True,
                    margin={"top": "0.5in", "bottom": "0.5in", "left": "0.5in", "right": "0.5in"},
                )
                logger.info("html_pdf_rendered", url=url, bytes=len(pdf_bytes))
                return pdf_bytes
            finally:
                await browser.close()
    except Exception as exc:
        logger.warning("html_pdf_failed", url=url, error=str(exc))
        return None


__all__ = ["render_html_to_pdf"]
