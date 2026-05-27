"""API v1 root router — aggregates all v1 sub-routers."""

from fastapi import APIRouter

from app.api.v1 import jobs, regingest, regscout, rulesense, tenants, users

router = APIRouter()

router.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(rulesense.router, prefix="/rulesense", tags=["rulesense"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(regscout.router, prefix="/regscout", tags=["regscout"])
router.include_router(regingest.router, prefix="/regingest", tags=["regingest"])
