"""Alembic environment for async SQLAlchemy migrations."""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# ---------------------------------------------------------------------------
# Import all models so Alembic's autogenerate can see them
# ---------------------------------------------------------------------------
from app.db.models import Base
from app.db.models.audit_log import AuditLog  # noqa: F401
from app.db.models.chat_message import ChatMessage  # noqa: F401
from app.db.models.chat_session import ChatSession  # noqa: F401
from app.db.models.discovered_document import DiscoveredDocument  # noqa: F401
from app.db.models.document import Document  # noqa: F401
from app.db.models.document_chunk import DocumentChunk  # noqa: F401
from app.db.models.job import Job  # noqa: F401
from app.db.models.regulatory_source import RegulatorySource  # noqa: F401
from app.db.models.role import Role, UserRole  # noqa: F401
from app.db.models.tenant import Tenant  # noqa: F401
from app.db.models.user import User  # noqa: F401

# ---------------------------------------------------------------------------
# Alembic Config
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file's logging section if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    """Allow DATABASE_URL env override over alembic.ini value."""
    import os

    return os.getenv(
        "DATABASE_URL",
        config.get_main_option("sqlalchemy.url", ""),
    )


# ---------------------------------------------------------------------------
# Offline migrations (no live DB connection)
# ---------------------------------------------------------------------------


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL)."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online migrations (async)
# ---------------------------------------------------------------------------


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run the migrations."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
