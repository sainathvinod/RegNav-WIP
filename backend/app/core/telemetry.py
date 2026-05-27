"""OpenTelemetry tracing setup.

Wiring is intentionally **soft**: if OpenTelemetry packages aren't
installed or no OTLP endpoint is configured, the tracer falls back to a
no-op and the rest of the app runs unchanged. This keeps the dev
container slim while letting prod ship full traces to Azure
Application Insights (or any OTLP-compatible collector).

Configure via environment variables (see ``app.core.config``):
- ``OTEL_ENABLED=true`` to turn it on
- ``OTEL_SERVICE_NAME`` to tag the service (default: ``regnav-backend``)
- ``OTEL_EXPORTER_OTLP_ENDPOINT`` — collector URL (or App Insights
  ingestion endpoint)
- ``OTEL_EXPORTER_OTLP_HEADERS`` — optional headers (e.g. App Insights
  connection-string fragments)
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_initialised = False


def configure_tracing() -> None:
    """Initialise the OpenTelemetry tracer provider exactly once.

    Idempotent. Silently no-ops when telemetry is disabled or the
    optional OTel packages are not installed. Safe to call from both
    the API and worker entrypoints.
    """
    global _initialised
    if _initialised:
        return

    if not settings.otel_enabled:
        logger.debug("otel_disabled")
        _initialised = True
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError as exc:
        logger.warning("otel_packages_missing", error=str(exc))
        _initialised = True
        return

    resource = Resource.create(
        {
            "service.name": settings.otel_service_name,
            "service.version": "0.1.0",
            "deployment.environment": settings.app_env,
        }
    )
    provider = TracerProvider(resource=resource)

    exporter = _build_otlp_exporter()
    if exporter is not None:
        provider.add_span_processor(BatchSpanProcessor(exporter))

    trace.set_tracer_provider(provider)
    _install_auto_instrumentations()

    logger.info(
        "otel_initialised",
        service=settings.otel_service_name,
        endpoint=settings.otel_exporter_otlp_endpoint,
        has_exporter=exporter is not None,
    )
    _initialised = True


def _build_otlp_exporter() -> Any | None:
    """Construct an OTLP HTTP exporter from settings.

    Returns ``None`` when no endpoint is configured (useful for sampling
    locally without sending data anywhere).
    """
    if not settings.otel_exporter_otlp_endpoint:
        return None
    try:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
    except ImportError as exc:
        logger.warning("otel_otlp_exporter_missing", error=str(exc))
        return None

    headers: dict[str, str] = {}
    if settings.otel_exporter_otlp_headers:
        # Accept ``key1=val1,key2=val2`` (the standard OTel env-var format).
        for kv in settings.otel_exporter_otlp_headers.split(","):
            if "=" in kv:
                k, v = kv.split("=", 1)
                headers[k.strip()] = v.strip()

    return OTLPSpanExporter(
        endpoint=settings.otel_exporter_otlp_endpoint,
        headers=headers or None,
    )


def _install_auto_instrumentations() -> None:
    """Wire the FastAPI/SQLAlchemy/httpx auto-instrumenters when available."""
    # FastAPI
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor().instrument()
    except ImportError:
        pass

    # SQLAlchemy
    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

        SQLAlchemyInstrumentor().instrument()
    except ImportError:
        pass

    # httpx (outbound calls to Anthropic / OpenAI / Azure)
    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument()
    except ImportError:
        pass

    # Bridge logging records → spans (so structlog lines land on traces)
    try:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)
    except ImportError:
        pass


def get_tracer(name: str) -> Any:
    """Return a tracer; falls back to OTel's default no-op when disabled."""
    try:
        from opentelemetry import trace

        return trace.get_tracer(name)
    except ImportError:
        return _NoopTracer()


# ---------------------------------------------------------------------------
# Fallback no-op tracer for environments without OpenTelemetry installed
# ---------------------------------------------------------------------------


class _NoopSpan:
    def __enter__(self) -> _NoopSpan:
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def set_attribute(self, _key: str, _value: object) -> None:
        return None

    def set_status(self, _status: object) -> None:
        return None

    def record_exception(self, _exc: BaseException) -> None:
        return None


class _NoopTracer:
    def start_as_current_span(self, _name: str, **_kwargs: Any) -> _NoopSpan:
        return _NoopSpan()


def _attach_trace_context_to_logs() -> None:
    """Inject OTel trace_id / span_id into stdlib log records.

    Called automatically when ``configure_tracing`` finds the logging
    instrumentation; this helper exists so tests can call it directly.
    """
    try:
        from opentelemetry.instrumentation.logging import LoggingInstrumentor

        LoggingInstrumentor().instrument(set_logging_format=False)
    except ImportError:
        logging.getLogger(__name__).debug("LoggingInstrumentor not available")
