"""Unit tests for the text chunker."""

from itertools import pairwise

import pytest

from app.services.chunking import chunk_text


def test_returns_empty_for_blank_text() -> None:
    assert chunk_text("") == []
    assert chunk_text("   \n  ") == []


def test_short_text_returns_single_chunk() -> None:
    short = "Auto insurance must comply with state minimums."
    chunks = chunk_text(short, chunk_size=800, overlap=100)
    assert chunks == [short]


def test_long_text_is_split_to_chunks_under_chunk_size() -> None:
    sentence = (
        "Workers compensation policies require the carrier to disclose all premium calculations. "
    )
    text = sentence * 80  # ~6.4k chars
    chunks = chunk_text(text, chunk_size=400, overlap=50)

    assert len(chunks) > 1
    # Every chunk fits under chunk_size with at most a small slack for overlap glue.
    for chunk in chunks:
        assert len(chunk) <= 500


def test_chunks_overlap_for_context_continuity() -> None:
    """Consecutive chunks should share at least some tail/head text."""
    text = "Sentence one is here. " * 200
    chunks = chunk_text(text, chunk_size=300, overlap=80)
    assert len(chunks) >= 2

    overlaps_found = 0
    for prev, nxt in pairwise(chunks):
        # Look for any 20-char window from prev's tail inside nxt's head.
        tail = prev[-80:]
        for start in range(0, max(1, len(tail) - 20)):
            window = tail[start : start + 20]
            if window and window in nxt[:160]:
                overlaps_found += 1
                break

    # At least most boundaries should overlap (we tolerate one without).
    assert overlaps_found >= max(1, len(chunks) - 2)


def test_chunks_preserve_sentence_boundaries_when_possible() -> None:
    text = (
        "First sentence ends here. "
        "Second sentence is right after. "
        "Third one continues. "
        "Fourth wraps it up."
    )
    chunks = chunk_text(text, chunk_size=60, overlap=10)
    # No chunk should split mid-word for these sentence-aligned inputs.
    for chunk in chunks:
        assert chunk.strip()
        # Each chunk should start at a letter (not whitespace).
        assert chunk[0].isalnum() or chunk[0] in '(["'


def test_oversized_single_sentence_is_hard_split() -> None:
    long_sentence = "x" * 1000 + "."
    chunks = chunk_text(long_sentence, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 200


def test_invalid_parameters_raise() -> None:
    with pytest.raises(ValueError):
        chunk_text("hello", chunk_size=0)
    with pytest.raises(ValueError):
        chunk_text("hello", chunk_size=100, overlap=100)
    with pytest.raises(ValueError):
        chunk_text("hello", chunk_size=100, overlap=-1)
