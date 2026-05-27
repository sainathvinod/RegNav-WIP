"""RegValidate service — validate insurance data files against active rules.

Supports WCPOLS flat-file, CSV, and plain-text formats. Validation uses an
LLM pass to check the file against each approved rule in the tenant's rule
set, generating structured findings with severity, field, and suggestion.
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import Rule, ValidationResult, ValidationRun
from app.llm.credentials import get_anthropic_api_key

logger = get_logger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

_VALIDATION_SYSTEM = """\
You are a US insurance regulatory compliance validator.
You will be given:
1. A snippet of an insurance data file (WCPOLS, CSV, or plain text).
2. A list of compliance rules that apply to this type of file.

Your task: for each rule, determine whether the file content appears to comply.
If a violation or potential issue is detected, report it.

Return ONLY a valid JSON object with key "findings" containing a list of finding objects.
Each finding must have:
  - rule_code: string — the rule code that was violated
  - severity: string — one of: error, warning, info
  - field_name: string or null — the specific field/column with the issue
  - field_value: string or null — the problematic value found (max 200 chars)
  - message: string — clear description of the compliance issue
  - line_number: number or null — approximate line number if identifiable
  - suggestion: string or null — how to fix the issue

If the file complies with all rules, return {"findings": []}.
Do NOT wrap the JSON in markdown code fences.
Only report genuine compliance issues; do not flag every field.
"""


async def validate_file(
    db: AsyncSession,
    validation_run_id: uuid.UUID,
    tenant_id: uuid.UUID,
    file_content: str,
    file_type: str,
    state_code: str | None = None,
    lob: str | None = None,
) -> ValidationRun:
    """Run validation and persist results to the database.

    Updates the ValidationRun row in place and returns it.
    Caller must commit the session.
    """
    run = await db.get(ValidationRun, validation_run_id)
    if run is None or run.tenant_id != tenant_id:
        raise ValueError(f"ValidationRun {validation_run_id} not found")

    run.status = "running"
    await db.flush()

    # Load approved rules scoped to this state/lob
    stmt = select(Rule).where(
        Rule.tenant_id == tenant_id,
        Rule.status == "approved",
        Rule.deleted_at.is_(None),
    )
    if state_code:
        stmt = stmt.where((Rule.state_code == state_code) | (Rule.state_code.is_(None)))
    if lob:
        stmt = stmt.where((Rule.line_of_business == lob) | (Rule.line_of_business.is_(None)))
    result = await db.execute(stmt)
    rules = result.scalars().all()

    if not rules:
        run.status = "completed"
        run.total_rules_checked = 0
        run.violations_found = 0
        run.warnings_found = 0
        run.completed_at = datetime.now(UTC)
        await db.flush()
        logger.info(
            "regvalidate_no_rules",
            run_id=str(validation_run_id),
            tenant_id=str(tenant_id),
        )
        return run

    # Build rules summary for the prompt
    rules_text = _format_rules_for_prompt(rules)

    try:
        findings = await _call_validation_api(file_content, file_type, rules_text)
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)[:2000]
        run.completed_at = datetime.now(UTC)
        await db.flush()
        logger.exception("regvalidate_api_failed", run_id=str(validation_run_id))
        return run

    # Build rule_code → Rule lookup
    rule_map = {r.rule_code: r for r in rules}

    violation_count = 0
    warning_count = 0

    for finding in findings:
        severity = _coerce_severity(finding.get("severity"))
        matched_rule = rule_map.get(str(finding.get("rule_code") or ""))

        vr = ValidationResult(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            validation_run_id=validation_run_id,
            rule_id=matched_rule.id if matched_rule else None,
            severity=severity,
            field_name=_safe_str(finding.get("field_name"), 128),
            field_value=_safe_str(finding.get("field_value"), 512),
            message=str(finding.get("message") or "Compliance issue detected.")[:2000],
            line_number=_safe_int(finding.get("line_number")),
            suggestion=_safe_str(finding.get("suggestion"), 1000),
        )
        db.add(vr)

        if severity == "error":
            violation_count += 1
        elif severity == "warning":
            warning_count += 1

    run.status = "completed"
    run.total_rules_checked = len(rules)
    run.violations_found = violation_count
    run.warnings_found = warning_count
    run.completed_at = datetime.now(UTC)
    await db.flush()

    logger.info(
        "regvalidate_completed",
        run_id=str(validation_run_id),
        rules_checked=len(rules),
        violations=violation_count,
        warnings=warning_count,
    )
    return run


async def _call_validation_api(
    file_content: str,
    file_type: str,
    rules_text: str,
) -> list[dict]:  # type: ignore[type-arg]
    api_key = await get_anthropic_api_key()
    user_message = (
        f"File type: {file_type}\n\n"
        f"Compliance rules to check against:\n{rules_text}\n\n"
        f"File content (first 8000 chars):\n{file_content[:8000]}"
    )
    payload = {
        "model": settings.chat_model,
        "system": _VALIDATION_SYSTEM,
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
        raise RuntimeError(f"Anthropic API returned {response.status_code}: {response.text[:300]}")

    body = response.json()
    content = body.get("content") or []
    raw_text = ""
    for block in content:
        if block.get("type") == "text":
            raw_text += block.get("text", "")

    try:
        parsed = json.loads(raw_text.strip())
        return list(parsed.get("findings") or [])
    except (json.JSONDecodeError, AttributeError):
        logger.warning("regvalidate_parse_failed", raw_preview=raw_text[:200])
        return []


def _format_rules_for_prompt(rules: list[Rule]) -> str:
    lines: list[str] = []
    for r in rules[:50]:  # cap to avoid token overflow
        parts = [f"[{r.rule_code}]"]
        if r.state_code:
            parts.append(f"State:{r.state_code}")
        if r.line_of_business:
            parts.append(f"LOB:{r.line_of_business}")
        parts.append(f"Type:{r.rule_type}")
        parts.append(f"— {r.title}")
        parts.append(f": {r.text[:300]}")
        lines.append(" ".join(parts))
    return "\n".join(lines)


def _coerce_severity(value: object) -> str:
    if isinstance(value, str) and value.lower() in {"error", "warning", "info"}:
        return value.lower()
    return "error"


def _safe_str(value: object, max_len: int) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s[:max_len] if s else None


def _safe_int(value: object) -> int | None:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
