"""Discovery profile — a saved RegScout configuration + its discovered sources.

A profile bundles the inputs (countries, states, LOB, doc types) that drove a
RegScout run together with the regulatory sources that came out of it. Users
re-load profiles into RegScout to re-run discovery without retyping settings,
or hand them off to RuleMiner so the right document set feeds rule extraction.
"""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import Base, SoftDeleteMixin, TimestampMixin


class DiscoveryProfile(TimestampMixin, SoftDeleteMixin, Base):
    """Persisted RegScout discovery profile."""

    __tablename__ = "discovery_profiles"

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
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="draft",
        comment="One of: draft, finalized, used_for_rules",
    )

    # Free-form JSON blobs — the front-end owns the schema. Storing as
    # JSONB lets us evolve the shape without migrations and lets us index
    # specific keys later if filtering needs it.
    configuration: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    sources: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    profile_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    tags: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
