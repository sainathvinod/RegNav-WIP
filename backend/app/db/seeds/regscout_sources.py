"""Default RegulatorySource rows for a fresh tenant.

These URLs are public regulator index pages. Adding the rows does NOT
trigger any HTTP traffic — discovery only runs when the worker picks up a
``regscout.discover`` job.
"""

from __future__ import annotations

import uuid

from app.db.models import RegulatorySource

_DEFAULTS = [
    {
        "name": "California Department of Insurance — Bulletins",
        "url": "https://www.insurance.ca.gov/0250-insurers/0300-insurers/0200-bulletins/",
        "source_type": "state_dept",
        "state_code": "CA",
    },
    {
        "name": "California Department of Insurance — Regulations",
        "url": "https://www.insurance.ca.gov/0250-insurers/0500-legal-info/",
        "source_type": "state_dept",
        "state_code": "CA",
    },
    {
        "name": "Texas Department of Insurance — Bulletins",
        "url": "https://www.tdi.texas.gov/bulletins/",
        "source_type": "state_dept",
        "state_code": "TX",
    },
    {
        "name": "New York Department of Financial Services — Industry Letters",
        "url": "https://www.dfs.ny.gov/industry_guidance/industry_letters",
        "source_type": "state_dept",
        "state_code": "NY",
    },
    {
        "name": "Florida Office of Insurance Regulation — Bulletins",
        "url": "https://floir.com/legal-and-regulatory/regulatory-publications/bulletins",
        "source_type": "state_dept",
        "state_code": "FL",
    },
    {
        "name": "Illinois Department of Insurance — Bulletins",
        "url": "https://idoi.illinois.gov/legal/bulletins.html",
        "source_type": "state_dept",
        "state_code": "IL",
    },
    {
        "name": "Pennsylvania Insurance Department — Notices",
        "url": "https://www.insurance.pa.gov/Regulations/Pages/default.aspx",
        "source_type": "state_dept",
        "state_code": "PA",
    },
    {
        "name": "Wisconsin Office of the Commissioner of Insurance — Bulletins",
        "url": "https://oci.wi.gov/Pages/Regulation/Bulletins.aspx",
        "source_type": "state_dept",
        "state_code": "WI",
    },
    {
        "name": "NAIC — Center for Insurance Policy and Research",
        "url": "https://content.naic.org/cipr/",
        "source_type": "naic",
        "state_code": None,
    },
    {
        "name": "Federal Register — Insurance Notices",
        "url": "https://www.federalregister.gov/agencies/federal-insurance-office",
        "source_type": "federal_register",
        "state_code": None,
    },
]


def default_sources_for_tenant(tenant_id: uuid.UUID) -> list[RegulatorySource]:
    """Build (but do not persist) the default RegulatorySource rows for ``tenant_id``."""
    return [
        RegulatorySource(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=spec["name"],
            url=spec["url"],
            source_type=spec["source_type"],
            state_code=spec.get("state_code"),
            lob=None,
            enabled=True,
        )
        for spec in _DEFAULTS
    ]


__all__ = ["default_sources_for_tenant"]
