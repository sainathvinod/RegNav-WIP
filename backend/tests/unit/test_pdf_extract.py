"""Tests for the Docling-first / pypdf-fallback PDF text extractor."""

from __future__ import annotations

import io

import pytest
from pypdf import PdfWriter

from app.services.pdf_extract import extract_pdf_text


def _build_blank_pdf(pages: int = 2) -> bytes:
    """Build a syntactically-valid empty PDF in memory."""
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_extract_returns_page_count_for_blank_pdf() -> None:
    """Blank pages produce empty text but a correct page count."""
    pdf_bytes = _build_blank_pdf(pages=3)
    text, pages = extract_pdf_text(pdf_bytes)
    assert pages == 3
    assert text == ""


def test_extract_handles_garbage_bytes_gracefully() -> None:
    """Garbage input yields an empty result, not an exception."""
    text, pages = extract_pdf_text(b"this is not a pdf")
    assert text == ""
    assert pages == 0


@pytest.mark.parametrize("input_bytes", [b"", b"\x00\x00\x00"])
def test_extract_handles_pathological_inputs(input_bytes: bytes) -> None:
    """Empty / null inputs return ``("", 0)`` without raising."""
    text, pages = extract_pdf_text(input_bytes)
    assert text == ""
    assert pages == 0
