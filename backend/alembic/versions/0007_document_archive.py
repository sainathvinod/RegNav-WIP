"""Phase 12 — document archive blob columns.

Adds three columns to ``documents`` so we can keep the original file
(PDF upload or HTML-rendered-as-PDF) in object storage and look it up by
key without bloating the database.

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-27 00:00:00.000000
"""

import sqlalchemy as sa

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("archive_blob_key", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("archive_content_type", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("archive_size_bytes", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "archive_size_bytes")
    op.drop_column("documents", "archive_content_type")
    op.drop_column("documents", "archive_blob_key")
