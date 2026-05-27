"""Worker handlers registered with :class:`WorkerRunner`."""

from app.workers.handlers.regingest import (
    handle_regingest_ingest_file,
    handle_regingest_ingest_text,
    handle_regingest_ingest_url,
)
from app.workers.handlers.regscout import handle_regscout_discover
from app.workers.handlers.ruleminer import handle_ruleminer_extract

HANDLERS = {
    "regscout.discover": handle_regscout_discover,
    "regingest.ingest_url": handle_regingest_ingest_url,
    "regingest.ingest_text": handle_regingest_ingest_text,
    "regingest.ingest_file": handle_regingest_ingest_file,
    "ruleminer.extract": handle_ruleminer_extract,
}

__all__ = [
    "HANDLERS",
    "handle_regingest_ingest_file",
    "handle_regingest_ingest_text",
    "handle_regingest_ingest_url",
    "handle_regscout_discover",
    "handle_ruleminer_extract",
]
