"""RuleMiner API — rule extraction, CRUD, and approval workflow."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import Document, Rule
from app.services import jobs as jobs_service

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RuleResponse(BaseModel):
    id: uuid.UUID
    rule_code: str = Field(..., alias="ruleCode")
    state_code: str | None = Field(None, alias="stateCode")
    line_of_business: str | None = Field(None, alias="lineOfBusiness")
    rule_type: str = Field(..., alias="ruleType")
    title: str
    text: str
    rationale: str | None
    effective_date: str | None = Field(None, alias="effectiveDate")
    status: str
    confidence_score: float | None = Field(None, alias="confidenceScore")
    source_document_id: uuid.UUID | None = Field(None, alias="sourceDocumentId")
    reviewed_by: uuid.UUID | None = Field(None, alias="reviewedBy")
    reviewed_at: datetime | None = Field(None, alias="reviewedAt")
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"from_attributes": True, "populate_by_name": True}

    @classmethod
    def from_orm(cls, rule: Rule) -> RuleResponse:
        return cls(
            id=rule.id,
            ruleCode=rule.rule_code,
            stateCode=rule.state_code,
            lineOfBusiness=rule.line_of_business,
            ruleType=rule.rule_type,
            title=rule.title,
            text=rule.text,
            rationale=rule.rationale,
            effectiveDate=rule.effective_date.isoformat() if rule.effective_date else None,
            status=rule.status,
            confidenceScore=rule.confidence_score,
            sourceDocumentId=rule.source_document_id,
            reviewedBy=rule.reviewed_by,
            reviewedAt=rule.reviewed_at,
            createdAt=rule.created_at,
        )


class ExtractRequest(BaseModel):
    document_id: uuid.UUID = Field(..., alias="documentId")

    model_config = {"populate_by_name": True}


class UpdateRuleRequest(BaseModel):
    title: str | None = Field(default=None, max_length=512)
    text: str | None = None
    rationale: str | None = None
    rule_type: str | None = Field(default=None, alias="ruleType")
    state_code: str | None = Field(default=None, max_length=8, alias="stateCode")
    line_of_business: str | None = Field(
        default=None, max_length=64, alias="lineOfBusiness"
    )

    model_config = {"populate_by_name": True}


class JobIdResponse(BaseModel):
    job_id: uuid.UUID = Field(..., alias="jobId")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/rules", response_model=list[RuleResponse])
async def list_rules(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    rule_status: str | None = Query(default=None, alias="status"),
    state_code: str | None = Query(default=None, alias="stateCode"),
    lob: str | None = Query(default=None),
    document_id: uuid.UUID | None = Query(default=None, alias="documentId"),
    limit: int = Query(default=200, ge=1, le=500),
) -> list[RuleResponse]:
    stmt = (
        select(Rule)
        .where(Rule.deleted_at.is_(None))
        .order_by(Rule.created_at.desc())
        .limit(limit)
    )
    if rule_status:
        stmt = stmt.where(Rule.status == rule_status)
    if state_code:
        stmt = stmt.where(Rule.state_code == state_code)
    if lob:
        stmt = stmt.where(Rule.line_of_business == lob)
    if document_id:
        stmt = stmt.where(Rule.source_document_id == document_id)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [RuleResponse.from_orm(r) for r in rows]


@router.get("/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuleResponse:
    rule = await _load_rule(db, rule_id, user.tenant_id)
    return RuleResponse.from_orm(rule)


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    body: UpdateRuleRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuleResponse:
    rule = await _load_rule(db, rule_id, user.tenant_id)
    if rule.status not in {"draft"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft rules can be edited",
        )
    if body.title is not None:
        rule.title = body.title
    if body.text is not None:
        rule.text = body.text
    if body.rationale is not None:
        rule.rationale = body.rationale
    if body.rule_type is not None:
        rule.rule_type = body.rule_type
    if body.state_code is not None:
        rule.state_code = body.state_code or None
    if body.line_of_business is not None:
        rule.line_of_business = body.line_of_business or None
    await db.commit()
    await db.refresh(rule)
    return RuleResponse.from_orm(rule)


@router.post(
    "/rules/{rule_id}/approve",
    response_model=RuleResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_rule(
    rule_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuleResponse:
    rule = await _load_rule(db, rule_id, user.tenant_id)
    if rule.status == "approved":
        return RuleResponse.from_orm(rule)
    if rule.status not in {"draft", "rejected"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot approve a rule with status '{rule.status}'",
        )
    rule.status = "approved"
    rule.reviewed_by = user.user_id
    rule.reviewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(rule)
    return RuleResponse.from_orm(rule)


@router.post(
    "/rules/{rule_id}/reject",
    response_model=RuleResponse,
    status_code=status.HTTP_200_OK,
)
async def reject_rule(
    rule_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RuleResponse:
    rule = await _load_rule(db, rule_id, user.tenant_id)
    if rule.status == "rejected":
        return RuleResponse.from_orm(rule)
    rule.status = "rejected"
    rule.reviewed_by = user.user_id
    rule.reviewed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(rule)
    return RuleResponse.from_orm(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    rule = await _load_rule(db, rule_id, user.tenant_id)
    rule.deleted_at = datetime.now(UTC)
    rule.deleted_by = user.user_id
    await db.commit()


@router.post(
    "/extract",
    response_model=JobIdResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_extraction(
    body: ExtractRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobIdResponse:
    doc = await db.get(Document, body.document_id)
    if doc is None or doc.tenant_id != user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    if doc.status != "indexed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document is not indexed yet (status: {doc.status}). "
            "Ingest it first via RegIngest.",
        )

    job = await jobs_service.enqueue_job(
        db,
        tenant_id=user.tenant_id,
        user_id=user.user_id,
        job_type="ruleminer.extract",
        input={"document_id": str(body.document_id)},
    )
    await db.commit()
    return JobIdResponse.model_validate({"jobId": job.id})


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _load_rule(
    db: AsyncSession,
    rule_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> Rule:
    rule = await db.get(Rule, rule_id)
    if rule is None or rule.deleted_at is not None or rule.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rule not found",
        )
    return rule
