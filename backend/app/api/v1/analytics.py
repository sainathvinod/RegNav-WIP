"""Analytics API — real-time dashboard stats for the current tenant."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.db.engine import get_db
from app.db.models import Document, Rule, ValidationRun

router = APIRouter()


class RuleStats(BaseModel):
    total: int
    draft: int
    approved: int
    rejected: int


class ValidationStats(BaseModel):
    total: int
    today: int
    violations_rate: float


class AnalyticsSummary(BaseModel):
    documents: int
    rules: RuleStats
    validations: ValidationStats
    compliance_score: float


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummary:
    """Return aggregated stats for the current tenant's data."""

    # --- Documents -------------------------------------------------------
    doc_count = (
        await db.scalar(
            select(func.count()).select_from(Document).where(Document.deleted_at.is_(None))
        )
        or 0
    )

    # --- Rules by status -------------------------------------------------
    rules_result = await db.execute(
        select(Rule.status, func.count()).where(Rule.deleted_at.is_(None)).group_by(Rule.status)
    )
    rule_counts: dict[str, int] = {row[0]: row[1] for row in rules_result}
    rules = RuleStats(
        total=sum(rule_counts.values()),
        draft=rule_counts.get("draft", 0),
        approved=rule_counts.get("approved", 0),
        rejected=rule_counts.get("rejected", 0),
    )

    # --- Validation runs -------------------------------------------------
    total_runs = (
        await db.scalar(
            select(func.count())
            .select_from(ValidationRun)
            .where(ValidationRun.tenant_id == user.tenant_id)
        )
        or 0
    )

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    today_runs = (
        await db.scalar(
            select(func.count())
            .select_from(ValidationRun)
            .where(
                ValidationRun.tenant_id == user.tenant_id,
                ValidationRun.created_at >= today_start,
            )
        )
        or 0
    )

    # Compliance score: % of completed runs in last 30 days with 0 violations
    cutoff = datetime.now(UTC) - timedelta(days=30)
    recent_runs_result = await db.execute(
        select(ValidationRun.violations_found).where(
            ValidationRun.tenant_id == user.tenant_id,
            ValidationRun.status == "completed",
            ValidationRun.created_at >= cutoff,
        )
    )
    recent_rows = recent_runs_result.scalars().all()
    if recent_rows:
        clean = sum(1 for v in recent_rows if v == 0)
        compliance = round(clean / len(recent_rows) * 100, 1)
        total_violations = sum(recent_rows)
        violations_rate = round(total_violations / len(recent_rows), 2)
    else:
        compliance = 100.0
        violations_rate = 0.0

    return AnalyticsSummary(
        documents=doc_count,
        rules=rules,
        validations=ValidationStats(
            total=total_runs,
            today=today_runs,
            violations_rate=violations_rate,
        ),
        compliance_score=compliance,
    )
