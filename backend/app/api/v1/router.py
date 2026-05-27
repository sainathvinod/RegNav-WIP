"""API v1 root router — aggregates all v1 sub-routers."""

from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    audit,
    config,
    discovery_profiles,
    jobs,
    notifications,
    organizations,
    regingest,
    regscout,
    regvalidate,
    ruleminer,
    rulesense,
    tenants,
    users,
)

router = APIRouter()

router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
router.include_router(config.router, prefix="/config", tags=["config"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
router.include_router(audit.router, prefix="/audit", tags=["audit"])
router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
router.include_router(rulesense.router, prefix="/rulesense", tags=["rulesense"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(regscout.router, prefix="/regscout", tags=["regscout"])
router.include_router(regingest.router, prefix="/regingest", tags=["regingest"])
router.include_router(ruleminer.router, prefix="/ruleminer", tags=["ruleminer"])
router.include_router(regvalidate.router, prefix="/regvalidate", tags=["regvalidate"])
router.include_router(
    discovery_profiles.router, prefix="/profiles", tags=["discovery-profiles"]
)
