"""Simple character-based chunker with sentence-aware splitting.

We avoid heavy NLP dependencies — split on sentence boundaries when
possible, otherwise on whitespace. 4 chars roughly approximates 1 token.
"""

from __future__ import annotations

import re

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def chunk_text(
    text: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> list[str]:
    """Split text into roughly `chunk_size`-character chunks with overlap.

    Behaviour:
      * Tries to break on sentence boundaries.
      * Falls back to whitespace if a single sentence is longer than chunk_size.
      * Successive chunks overlap by `overlap` characters of the *previous*
        chunk's tail (to preserve context across boundaries).
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be in [0, chunk_size)")

    cleaned = text.strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    sentences = _SENTENCE_SPLIT.split(cleaned)

    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if not sentence:
            continue

        # If a single sentence exceeds chunk_size, hard-split it on whitespace.
        if len(sentence) > chunk_size:
            if current:
                chunks.append(current.strip())
                current = _tail(current, overlap)
            for piece in _hard_split(sentence, chunk_size, overlap):
                chunks.append(piece.strip())
            current = _tail(chunks[-1], overlap) if chunks else ""
            continue

        candidate = f"{current} {sentence}".strip() if current else sentence
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            chunks.append(current.strip())
            tail = _tail(current, overlap)
            current = f"{tail} {sentence}".strip() if tail else sentence

    if current.strip():
        chunks.append(current.strip())

    # Drop empty chunks (defensive) and de-duplicate consecutive duplicates.
    out: list[str] = []
    for chunk in chunks:
        if chunk and (not out or out[-1] != chunk):
            out.append(chunk)
    return out


def _tail(text: str, n: int) -> str:
    """Return the last `n` characters of `text`, snapped to the nearest whitespace."""
    if n <= 0 or len(text) <= n:
        return text
    tail = text[-n:]
    # Try to start the tail on a word boundary.
    space = tail.find(" ")
    if 0 <= space < len(tail) - 1:
        return tail[space + 1 :]
    return tail


def _hard_split(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Fixed-width split for a single oversized sentence."""
    pieces: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(text), step):
        pieces.append(text[start : start + chunk_size])
        if start + chunk_size >= len(text):
            break
    return pieces
