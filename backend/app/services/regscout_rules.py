"""Link-extraction heuristics for RegScout discovery.

Given a parsed HTML page and the ``source_type`` of its origin, return
the canonical absolute URLs of likely regulatory documents. We keep
the rules simple and conservative — false positives cost an extra
HEAD request but no real harm.
"""

from __future__ import annotations

from collections.abc import Iterable
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

# Substrings (case-insensitive) that strongly suggest a regulatory doc.
_DOC_KEYWORDS = (
    "bulletin",
    "circular",
    "regulation",
    "regulations",
    "order",
    "notice",
    "filing",
    "rule",
    "rulemaking",
)

_DOC_EXTENSIONS = (".pdf", ".doc", ".docx", ".rtf", ".html", ".htm")

# Patterns we always skip — pure navigation, social, etc.
_SKIP_FRAGMENTS = (
    "javascript:",
    "mailto:",
    "tel:",
    "#",
)
_SKIP_KEYWORDS = (
    "facebook.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "instagram.com",
    "youtube.com",
    "/login",
    "/logout",
    "/signin",
    "/register",
)


def _looks_skippable(href: str) -> bool:
    lower = href.lower().strip()
    if not lower or lower in {"#", "/"}:
        return True
    if lower.startswith(_SKIP_FRAGMENTS):
        return True
    return any(skip in lower for skip in _SKIP_KEYWORDS)


def _same_domain(a: str, b: str) -> bool:
    return urlparse(a).netloc.lower() == urlparse(b).netloc.lower()


def _looks_state_dept(href: str, anchor_text: str) -> bool:
    blob = f"{href} {anchor_text}".lower()
    if any(kw in blob for kw in _DOC_KEYWORDS):
        return True
    return any(blob.endswith(ext) or ext in blob for ext in _DOC_EXTENSIONS)


def _looks_naic(href: str, anchor_text: str) -> bool:
    lower = href.lower()
    if "/cipr/" in lower or "/model-laws/" in lower or "/committees/" in lower:
        return True
    return _looks_state_dept(href, anchor_text)


def _iter_anchors(html: str) -> Iterable[tuple[str, str]]:
    soup = BeautifulSoup(html, "lxml")
    for anchor in soup.find_all("a"):
        if not isinstance(anchor, Tag):
            continue
        href = anchor.get("href")
        if not isinstance(href, str):
            continue
        text = anchor.get_text(" ", strip=True)
        yield href, text


def extract_candidate_links(
    html: str,
    base_url: str,
    source_type: str,
) -> list[dict[str, str]]:
    """Return ``[{'url', 'title'}]`` for likely document links.

    ``base_url`` is the URL the HTML was fetched from; relative hrefs
    are resolved against it.
    """
    seen: set[str] = set()
    results: list[dict[str, str]] = []

    matcher = _CHOOSERS.get(source_type, _CHOOSERS["custom"])

    for raw_href, anchor_text in _iter_anchors(html):
        href = raw_href.strip()
        if _looks_skippable(href):
            continue

        absolute = urljoin(base_url, href)
        # Drop trailing fragment — same doc identity
        if "#" in absolute:
            absolute = absolute.split("#", 1)[0]
        if not absolute.lower().startswith(("http://", "https://")):
            continue
        if absolute in seen:
            continue

        if source_type == "custom" and not _same_domain(absolute, base_url):
            continue

        if not matcher(absolute, anchor_text):
            continue

        seen.add(absolute)
        results.append({"url": absolute, "title": anchor_text[:512] or absolute})

    return results


_CHOOSERS = {
    "state_dept": _looks_state_dept,
    "bulletin_index": _looks_state_dept,
    "naic": _looks_naic,
    "federal_register": _looks_state_dept,
    "custom": lambda _href, _text: True,
}


__all__ = ["extract_candidate_links"]
