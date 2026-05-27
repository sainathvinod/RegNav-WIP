"""RegValidate API — file validation against active compliance rules."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.logging import get_logger
from app.db.engine import get_db
from app.db.models import ValidationResult, ValidationRun
from app.services import notifications
from app.services.regvalidate import validate_file

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class ValidateRequest(BaseModel):
    filename: str = Field(..., max_length=512)
    file_type: str = Field(default="wcpols", max_length=32)
    content: str = Field(..., description="Full text content of the file to validate")
    state_code: str | None = Field(default=None, max_length=8, alias="stateCode")
    lob: str | None = Field(default=None, max_length=64)

    model_config = {"populate_by_name": True}


class ValidationRunResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_type: str = Field(..., alias="fileType")
    status: str
    total_rules_checked: int = Field(..., alias="totalRulesChecked")
    violations_found: int = Field(..., alias="violationsFound")
    warnings_found: int = Field(..., alias="warningsFound")
    completed_at: str | None = Field(None, alias="completedAt")
    error_message: str | None = Field(None, alias="errorMessage")

    model_config = {"from_attributes": True, "populate_by_name": True}

    @classmethod
    def from_orm(cls, run: ValidationRun) -> ValidationRunResponse:
        return cls(
            id=run.id,
            filename=run.filename,
            fileType=run.file_type,
            status=run.status,
            totalRulesChecked=run.total_rules_checked,
            violationsFound=run.violations_found,
            warningsFound=run.warnings_found,
            completedAt=run.completed_at.isoformat() if run.completed_at else None,
            errorMessage=run.error_message,
        )


class ValidationResultResponse(BaseModel):
    id: uuid.UUID
    rule_id: uuid.UUID | None = Field(None, alias="ruleId")
    severity: str
    field_name: str | None = Field(None, alias="fieldName")
    field_value: str | None = Field(None, alias="fieldValue")
    message: str
    line_number: int | None = Field(None, alias="lineNumber")
    suggestion: str | None

    model_config = {"from_attributes": True, "populate_by_name": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/validate",
    response_model=ValidationRunResponse,
    status_code=status.HTTP_201_CREATED,
)
async def run_validation(
    body: ValidateRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ValidationRunResponse:
    run = ValidationRun(
        id=uuid.uuid4(),
        tenant_id=user.tenant_id,
        filename=body.filename,
        file_type=body.file_type,
        content_preview=body.content[:2000],
        status="pending",
    )
    db.add(run)
    await db.flush()

    completed_run = await validate_file(
        db,
        validation_run_id=run.id,
        tenant_id=user.tenant_id,
        file_content=body.content,
        file_type=body.file_type,
        state_code=body.state_code,
        lob=body.lob,
    )

    if completed_run.status == "completed":
        severity = (
            "success"
            if completed_run.violations_found == 0
            else "warning"
            if completed_run.violations_found < 5
            else "error"
        )
        await notifications.notify(
            db,
            tenant_id=user.tenant_id,
            user_id=user.user_id,
            event_type="validation.completed",
            title=f"Validation complete: {body.filename}",
            body=(
                f"{completed_run.total_rules_checked} rules checked · "
                f"{completed_run.violations_found} violation"
                f"{'s' if completed_run.violations_found != 1 else ''}, "
                f"{completed_run.warnings_found} warning"
                f"{'s' if completed_run.warnings_found != 1 else ''}."
            ),
            link=f"/regvalidate?run={completed_run.id}",
            severity=severity,
        )

    await db.commit()
    await db.refresh(completed_run)
    return ValidationRunResponse.from_orm(completed_run)


@router.get("/runs", response_model=list[ValidationRunResponse])
async def list_runs(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    run_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ValidationRunResponse]:
    stmt = (
        select(ValidationRun)
        .where(ValidationRun.tenant_id == user.tenant_id)
        .order_by(ValidationRun.created_at.desc())
        .limit(limit)
    )
    if run_status:
        stmt = stmt.where(ValidationRun.status == run_status)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [ValidationRunResponse.from_orm(r) for r in rows]


@router.get("/runs/{run_id}", response_model=ValidationRunResponse)
async def get_run(
    run_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ValidationRunResponse:
    run = await _load_run(db, run_id, user.tenant_id)
    return ValidationRunResponse.from_orm(run)


@router.get("/runs/{run_id}/results", response_model=list[ValidationResultResponse])
async def get_results(
    run_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    severity: str | None = None,
) -> list[ValidationResultResponse]:
    await _load_run(db, run_id, user.tenant_id)

    stmt = (
        select(ValidationResult)
        .where(ValidationResult.validation_run_id == run_id)
        .order_by(ValidationResult.created_at.asc())
    )
    if severity:
        stmt = stmt.where(ValidationResult.severity == severity)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [ValidationResultResponse.model_validate(r) for r in rows]


@router.delete("/runs/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(
    run_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    run = await _load_run(db, run_id, user.tenant_id)
    await db.delete(run)
    await db.commit()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _load_run(
    db: AsyncSession,
    run_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> ValidationRun:
    run = await db.get(ValidationRun, run_id)
    if run is None or run.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Validation run not found",
        )
    return run
