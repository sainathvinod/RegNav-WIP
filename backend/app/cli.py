"""Operator CLI (argparse — no extra deps).

Usage::

    python -m app.cli seed-regscout-sources --tenant-id <uuid>
"""

from __future__ import annotations

import argparse
import asyncio
import uuid

from sqlalchemy import select

from app.core.logging import configure_logging, get_logger
from app.db.engine import AsyncSessionLocal
from app.db.models import RegulatorySource
from app.db.rls import set_tenant_guc
from app.db.seeds.regscout_sources import default_sources_for_tenant

logger = get_logger(__name__)


async def _seed_regscout_sources(tenant_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as session:
        await set_tenant_guc(session, tenant_id)
        existing = await session.execute(
            select(RegulatorySource.url).where(RegulatorySource.tenant_id == tenant_id)
        )
        already: set[str] = {row[0] for row in existing.all()}

        rows = default_sources_for_tenant(tenant_id)
        added = 0
        for source in rows:
            if source.url in already:
                continue
            session.add(source)
            added += 1
        await session.commit()
        logger.info(
            "regscout_sources_seeded",
            tenant_id=str(tenant_id),
            added=added,
            already=len(already),
        )
        print(f"Seeded {added} new sources for tenant {tenant_id} ({len(already)} pre-existing).")


def main() -> None:
    configure_logging()
    parser = argparse.ArgumentParser(prog="app.cli", description="RegNav operator CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    seed = sub.add_parser(
        "seed-regscout-sources",
        help="Insert the default regulatory sources for a tenant",
    )
    seed.add_argument("--tenant-id", required=True, type=uuid.UUID)

    args = parser.parse_args()

    if args.command == "seed-regscout-sources":
        asyncio.run(_seed_regscout_sources(args.tenant_id))
    else:  # pragma: no cover — argparse already enforces this
        parser.error(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
