"""Telemetry setup smoke tests.

The critical guarantee: configure_tracing() must be safe to call when
OpenTelemetry isn't installed and when no endpoint is set. The rest of
the system relies on get_tracer() always returning something usable.
"""

from __future__ import annotations

import importlib

from app.core import telemetry
from app.core.config import settings


def _reset_telemetry() -> None:
    """Reset module state between tests so init can be retried."""
    telemetry._initialised = False


def test_configure_tracing_disabled_is_noop(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "otel_enabled", False)
    _reset_telemetry()
    # Must not raise even when disabled
    telemetry.configure_tracing()


def test_configure_tracing_idempotent(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "otel_enabled", False)
    _reset_telemetry()
    telemetry.configure_tracing()
    # Second call must be a fast no-op
    telemetry.configure_tracing()
    assert telemetry._initialised is True


def test_get_tracer_returns_usable_object_when_disabled() -> None:
    _reset_telemetry()
    tracer = telemetry.get_tracer("test")
    # The returned object must support start_as_current_span as a context manager,
    # whether OpenTelemetry is installed or not.
    with tracer.start_as_current_span("dummy") as span:
        # Setting attributes must not raise (real span or no-op span)
        span.set_attribute("test.key", "value")


def test_configure_tracing_enabled_no_endpoint_does_not_crash(
    monkeypatch,  # type: ignore[no-untyped-def]
) -> None:
    """Enabling tracing without an endpoint still completes — useful for
    sampling locally without shipping spans anywhere."""
    monkeypatch.setattr(settings, "otel_enabled", True)
    monkeypatch.setattr(settings, "otel_exporter_otlp_endpoint", None)
    _reset_telemetry()
    # Whether OTel is installed or not, this should not raise
    telemetry.configure_tracing()


def test_get_tracer_works_for_llm_modules() -> None:
    """Sanity-check that the modules using get_tracer at import time still load."""
    # These modules call get_tracer() at module scope; importing them must succeed
    # regardless of telemetry state.
    for module_name in (
        "app.llm.anthropic_chat",
        "app.llm.embeddings",
        "app.workers.runner",
    ):
        importlib.import_module(module_name)
