"""Tests for RegScout link-extraction heuristics."""

from __future__ import annotations

from app.services.regscout_rules import extract_candidate_links

_HTML = """
<!DOCTYPE html>
<html>
<head><title>Department of Insurance — Bulletins</title></head>
<body>
  <nav>
    <a href="/login">Login</a>
    <a href="/contact">Contact</a>
  </nav>
  <main>
    <h1>2026 Bulletins</h1>
    <ul>
      <li><a href="/bulletins/2026-04.pdf">Bulletin 2026-04 — Workers Comp</a></li>
      <li><a href="https://www.tdi.texas.gov/regulations/2026/rule-21.html">Rule 21 — Auto</a></li>
      <li><a href="/circulars/circular-12.doc">Circular 12</a></li>
      <li><a href="https://twitter.com/share">Tweet this</a></li>
      <li><a href="javascript:void(0)">Print</a></li>
      <li><a href="mailto:info@example.com">Email us</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </main>
  <footer>
    <a href="https://www.facebook.com/page">Follow on Facebook</a>
  </footer>
</body>
</html>
"""


def test_state_dept_extracts_bulletins_and_pdfs() -> None:
    links = extract_candidate_links(
        _HTML,
        "https://www.tdi.texas.gov/bulletins/",
        "state_dept",
    )

    urls = {link["url"] for link in links}

    assert "https://www.tdi.texas.gov/bulletins/2026-04.pdf" in urls
    assert "https://www.tdi.texas.gov/regulations/2026/rule-21.html" in urls
    assert "https://www.tdi.texas.gov/circulars/circular-12.doc" in urls
    # Social / login / mailto / javascript are filtered
    assert all("twitter.com" not in u for u in urls)
    assert all("facebook.com" not in u for u in urls)
    assert all("login" not in u for u in urls)


def test_links_skip_javascript_and_mailto() -> None:
    html = """
    <html><body>
      <a href="javascript:alert('hi')">Click</a>
      <a href="mailto:foo@bar.com">Email</a>
      <a href="#">Top</a>
      <a href="https://example.gov/circular-2.pdf">Circular</a>
    </body></html>
    """
    links = extract_candidate_links(html, "https://example.gov/", "state_dept")
    assert len(links) == 1
    assert links[0]["url"] == "https://example.gov/circular-2.pdf"


def test_relative_urls_resolved_against_base() -> None:
    html = '<html><body><a href="./bulletin-3.pdf">Bulletin 3</a></body></html>'
    links = extract_candidate_links(
        html,
        "https://oci.wi.gov/Pages/Regulation/",
        "bulletin_index",
    )
    assert len(links) == 1
    assert links[0]["url"] == "https://oci.wi.gov/Pages/Regulation/bulletin-3.pdf"


def test_naic_matches_model_laws_and_cipr() -> None:
    html = """
    <html><body>
      <a href="/cipr/insurance-topics/cybersecurity">Cyber</a>
      <a href="/model-laws/property-casualty">P&amp;C model laws</a>
      <a href="/about">About NAIC</a>
    </body></html>
    """
    links = extract_candidate_links(html, "https://content.naic.org/", "naic")
    urls = {link["url"] for link in links}
    assert "https://content.naic.org/cipr/insurance-topics/cybersecurity" in urls
    assert "https://content.naic.org/model-laws/property-casualty" in urls
    # /about doesn't match any doc keyword and isn't under /cipr/ or /model-laws/
    assert "https://content.naic.org/about" not in urls


def test_custom_keeps_same_domain_only() -> None:
    html = """
    <html><body>
      <a href="https://example.com/page1">Internal page</a>
      <a href="https://other.com/page2">External page</a>
    </body></html>
    """
    links = extract_candidate_links(html, "https://example.com/", "custom")
    urls = {link["url"] for link in links}
    assert "https://example.com/page1" in urls
    assert "https://other.com/page2" not in urls


def test_duplicate_urls_deduplicated() -> None:
    html = """
    <html><body>
      <a href="/bulletin-1.pdf">Bulletin 1</a>
      <a href="/bulletin-1.pdf">Bulletin 1 again</a>
      <a href="/bulletin-1.pdf#section">Bulletin 1 with fragment</a>
    </body></html>
    """
    links = extract_candidate_links(html, "https://example.gov/", "state_dept")
    assert len(links) == 1
