"""Standalone worker process entry point.

Usage::

    python -m app.workers.cli                  # default worker_id
    python -m app.workers.cli --worker-id w1   # explicit id
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import signal
import socket
import uuid

from app.core.logging import configure_logging, get_logger
from app.core.telemetry import configure_tracing
from app.workers.handlers import HANDLERS
from app.workers.runner import WorkerRunner

logger = get_logger(__name__)


def _default_worker_id() -> str:
    return f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"


async def _run(worker_id: str, poll_interval: float) -> None:
    runner = WorkerRunner(
        worker_id=worker_id,
        handlers=HANDLERS,
        poll_interval=poll_interval,
    )

    loop = asyncio.get_running_loop()
    pending: set[asyncio.Task[None]] = set()

    def _request_stop() -> None:
        logger.info("worker_stop_requested", worker_id=worker_id)
        task = loop.create_task(runner.stop())
        pending.add(task)
        task.add_done_callback(pending.discard)

    for sig_name in ("SIGINT", "SIGTERM"):
        sig = getattr(signal, sig_name, None)
        if sig is not None:
            with contextlib.suppress(NotImplementedError):
                # Windows event loops don't implement add_signal_handler.
                loop.add_signal_handler(sig, _request_stop)

    await runner.run()


def main() -> None:
    parser = argparse.ArgumentParser(description="RegNav background worker")
    parser.add_argument("--worker-id", default=_default_worker_id())
    parser.add_argument("--poll-interval", type=float, default=2.0)
    args = parser.parse_args()

    configure_logging()
    configure_tracing()
    logger.info(
        "worker_cli_starting",
        worker_id=args.worker_id,
        poll_interval=args.poll_interval,
    )
    asyncio.run(_run(args.worker_id, args.poll_interval))


if __name__ == "__main__":
    main()
