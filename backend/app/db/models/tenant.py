"""Tenant model."""

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin


class Tenant(TimestampMixin, SoftDeleteMixin, Base):
    """A tenant (organisation) in the multi-tenant system."""

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(63), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending",
    )
