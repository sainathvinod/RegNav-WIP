"""Phase 4 schema — rules, validation_runs, validation_results with RLS.

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-27 00:00:00.000000
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic
revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # rules
    # ------------------------------------------------------------------
    op.create_table(
        "rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "source_document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("rule_code", sa.String(64), nullable=False),
        sa.Column("state_code", sa.String(8), nullable=True),
        sa.Column("line_of_business", sa.String(64), nullable=True),
        sa.Column("rule_type", sa.String(32), nullable=False, server_default="general"),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("rationale", sa.Text, nullable=True),
        sa.Column("effective_date", sa.Date, nullable=True),
        sa.Column("expiry_date", sa.Date, nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("confidence_score", sa.Float, nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "rule_metadata",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
        # timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        # soft-delete
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_rules_tenant_id", "rules", ["tenant_id"])
    op.create_index("ix_rules_status", "rules", ["status"])
    op.create_index("ix_rules_rule_code", "rules", ["rule_code"])
    op.create_index("ix_rules_state_code", "rules", ["state_code"])
    op.create_index("ix_rules_line_of_business", "rules", ["line_of_business"])
    op.create_index("ix_rules_source_document_id", "rules", ["source_document_id"])

    # RLS
    op.execute("ALTER TABLE rules ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE rules FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON rules
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
        """
    )

    # ------------------------------------------------------------------
    # validation_runs
    # ------------------------------------------------------------------
    op.create_table(
        "validation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("file_type", sa.String(32), nullable=False, server_default="wcpols"),
        sa.Column("content_preview", sa.Text, nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("total_rules_checked", sa.Integer, nullable=False, server_default="0"),
        sa.Column("violations_found", sa.Integer, nullable=False, server_default="0"),
        sa.Column("warnings_found", sa.Integer, nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_validation_runs_tenant_id", "validation_runs", ["tenant_id"])
    op.create_index("ix_validation_runs_status", "validation_runs", ["status"])

    op.execute("ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE validation_runs FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON validation_runs
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
        """
    )

    # ------------------------------------------------------------------
    # validation_results
    # ------------------------------------------------------------------
    op.create_table(
        "validation_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "validation_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("validation_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "rule_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("rules.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("severity", sa.String(16), nullable=False, server_default="error"),
        sa.Column("field_name", sa.String(128), nullable=True),
        sa.Column("field_value", sa.String(512), nullable=True),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("line_number", sa.Integer, nullable=True),
        sa.Column("suggestion", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_validation_results_tenant_id", "validation_results", ["tenant_id"])
    op.create_index(
        "ix_validation_results_run_id", "validation_results", ["validation_run_id"]
    )

    op.execute("ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE validation_results FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON validation_results
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS validation_results CASCADE")
    op.execute("DROP TABLE IF EXISTS validation_runs CASCADE")
    op.execute("DROP TABLE IF EXISTS rules CASCADE")
