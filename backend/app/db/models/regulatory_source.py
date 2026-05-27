"""Regulatory source — a discoverable index page for ingestible documents."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin


class RegulatorySource(TimestampMixin, SoftDeleteMixin, Base):
    """A regulator/site page that RegScout periodically scans for new docs."""

    __tablename__ = "regulatory_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="custom",
        comment="One of: state_dept, naic, federal_register, bulletin_index, custom",
    )
    state_code: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    lob: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_status: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        comment="One of: ok, 404, 5xx, timeout, parse_error",
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovered_doc_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
