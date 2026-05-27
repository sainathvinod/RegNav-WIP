"""RuleMiner service — LLM-based rule extraction from regulatory documents.

Extraction is intentionally conservative: the LLM is asked to identify only
rules that are explicitly stated in the document, with a confidence score.
Extracted rules land in ``draft`` status and require human approval before
they are used in validation.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import Document, DocumentChunk, Rule
from app.llm.credentials import get_anthropic_api_key

logger = get_logger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

_EXTRACTION_SYSTEM = """\
You are a regulatory compliance analyst specialising in US insurance regulation.
Your task is to extract explicit compliance rules from the document text provided.

Return ONLY a valid JSON object with the key "rules" containing a list of rule objects.
Each rule object must have these exact fields:
  - rule_code: string  — short unique code, e.g. "WC-RATE-001"
  - state_code: string or null — 2-letter US state code if rule is state-specific
  - line_of_business: string or null — e.g. "Workers Compensation", "Homeowners", "Auto"
  - rule_type: string — one of: filing, underwriting, rating, claims, compliance, general
  - title: string — max 120 chars, descriptive title
  - text: string — verbatim or closely paraphrased rule text from the document
  - rationale: string or null — brief explanation of why this rule exists
  - effective_date: string or null — ISO date "YYYY-MM-DD" if mentioned
  - confidence_score: number — 0.0 to 1.0, how confident you are this is an explicit rule

Guidelines:
- Extract only rules that are explicitly stated; do not infer or fabricate rules.
- A "rule" must impose a requirement, restriction, or condition — not just general guidance.
- Assign confidence_score >= 0.8 only when the rule is unambiguously stated.
- If no rules are found, return {"rules": []}.
- Do NOT wrap the JSON in markdown code fences.
"""


async def extract_rules_from_document(
    db: AsyncSession,
    document_id: uuid.UUID,
    tenant_id: uuid.UUID,
    *,
    max_chunks: int = 20,
) -> list[Rule]:
    """Extract rules from all chunks of a Document using the Anthropic API.

    Returns a list of un-persisted Rule objects; the caller is responsible
    for adding them to the session and committing.
    """
    doc = await db.get(Document, document_id)
    if doc is None or doc.tenant_id != tenant_id:
        raise ValueError(f"Document {document_id} not found for tenant")

    stmt = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .limit(max_chunks)
    )
    result = await db.execute(stmt)
    chunks = result.scalars().all()

    if not chunks:
        logger.info("ruleminer_no_chunks", document_id=str(document_id))
        return []

    combined_text = "\n\n".join(c.text for c in chunks)
    extracted = await _call_extraction_api(combined_text, doc.title)

    rules: list[Rule] = []
    seen_codes: set[str] = set()

    for idx, item in enumerate(extracted):
        raw_code = str(item.get("rule_code") or f"RULE-{idx + 1:03d}").strip()
        rule_code = _dedup_code(raw_code, seen_codes)
        seen_codes.add(rule_code)

        rule = Rule(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            source_document_id=document_id,
            rule_code=rule_code,
            state_code=_safe_str(item.get("state_code"), 8),
            line_of_business=_safe_str(item.get("line_of_business"), 64),
            rule_type=_coerce_rule_type(item.get("rule_type")),
            title=_safe_str(item.get("title"), 512) or "Untitled Rule",
            text=str(item.get("text") or "").strip() or "No rule text extracted.",
            rationale=_safe_str(item.get("rationale"), 2000),
            effective_date=_parse_date(item.get("effective_date")),
            confidence_score=_safe_float(item.get("confidence_score")),
            status="draft",
            rule_metadata={
                "extracted_at": datetime.now(UTC).isoformat(),
                "source_document_title": doc.title,
                "chunk_count": len(chunks),
            },
        )
        rules.append(rule)

    logger.info(
        "ruleminer_extracted",
        document_id=str(document_id),
        rule_count=len(rules),
    )
    return rules


async def _call_extraction_api(text: str, doc_title: str) -> list[dict]:  # type: ignore[type-arg]
    api_key = await get_anthropic_api_key()
    user_message = (
        f"Document title: {doc_title}\n\n"
        f"Document text:\n{text[:40000]}"  # guard against huge payloads
    )
    payload = {
        "model": settings.chat_model,
        "system": _EXTRACTION_SYSTEM,
        "messages": [{"role": "user", "content": user_message}],
        "max_tokens": 4096,
    }
    headers = {
        "x-api-key": api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        logger.warning(
            "ruleminer_api_error",
            status=response.status_code,
            body=response.text[:400],
        )
        return []

    body = response.json()
    content = body.get("content") or []
    raw_text = ""
    for block in content:
        if block.get("type") == "text":
            raw_text += block.get("text", "")

    try:
        parsed = json.loads(raw_text.strip())
        return list(parsed.get("rules") or [])
    except (json.JSONDecodeError, AttributeError):
        logger.warning(
            "ruleminer_parse_failed",
            raw_preview=raw_text[:200],
        )
        return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dedup_code(code: str, seen: set[str]) -> str:
    if code not in seen:
        return code
    counter = 2
    while f"{code}-{counter}" in seen:
        counter += 1
    return f"{code}-{counter}"


def _coerce_rule_type(value: object) -> str:
    valid = {"filing", "underwriting", "rating", "claims", "compliance", "general"}
    if isinstance(value, str) and value.lower() in valid:
        return value.lower()
    return "general"


def _safe_str(value: object, max_len: int) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s[:max_len] if s else None


def _safe_float(value: object) -> float | None:
    try:
        f = float(value)  # type: ignore[arg-type]
        return max(0.0, min(1.0, f))
    except (TypeError, ValueError):
        return None


def _parse_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None
