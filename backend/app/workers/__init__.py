"""Background job worker package.

The worker runs as a separate process (``python -m app.workers.cli``). It
polls the Postgres ``jobs`` table, claims work atomically, and dispatches
to handlers registered in :mod:`app.workers.handlers`.
"""

from app.workers.runner import Handler, ProgressReporter, WorkerRunner

__all__ = ["Handler", "ProgressReporter", "WorkerRunner"]
