"""FastAPI application entry point.

This is the API gateway-facing process. In production it sits behind
Azure API Management, which terminates TLS, validates JWTs, and applies
rate limits before traffic reaches this app.
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.api.v1 import llm as llm_router_module
from app.api.v1.router import router as api_v1_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger.info(
        "startup",
        app=settings.app_name,
        env=settings.app_env,
        debug=settings.debug,
    )
    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ---- Request-ID middleware -------------------------------------------
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next) -> Response:  # type: ignore[type-arg]
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    # ---- Routers --------------------------------------------------------
    app.include_router(health.router)
    app.include_router(api_v1_router, prefix="/api/v1")
    app.include_router(llm_router_module.router, prefix="/api")

    return app


app = create_app()
