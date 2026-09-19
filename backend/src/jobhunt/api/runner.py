"""In-memory async pipeline runner.

Purpose: Non-blocking POST /runs with status polling.
Inputs: AppConfig; runs ``run_all`` on a background thread.
Returns: RunRecord updates via the store when possible.
Does not: Cancel mid-Gemini reliably (best-effort flag only).
"""

from __future__ import annotations

import threading
import uuid
from datetime import datetime
from typing import Callable

from jobhunt.config import AppConfig
from jobhunt.features.pipeline.run_all import run_all
from jobhunt.store.types import RunRecord, utc_now

_lock = threading.Lock()
_runs: dict[str, RunRecord] = {}
_cancel: set[str] = set()


def get_run(run_id: str) -> RunRecord | None:
    with _lock:
        return _runs.get(run_id)


def list_async_runs() -> list[RunRecord]:
    with _lock:
        return list(_runs.values())


def request_cancel(run_id: str) -> bool:
    with _lock:
        if run_id not in _runs:
            return False
        _cancel.add(run_id)
        rec = _runs[run_id]
        if rec.status in {"queued", "running"}:
            rec.status = "cancelled"
        return True


def start_async_run(config: AppConfig, *, on_done: Callable[[RunRecord], None] | None = None) -> RunRecord:
    """Queue a background ``run_all`` and return the run id immediately."""

    run_id = uuid.uuid4().hex[:12]
    record = RunRecord(
        id=run_id,
        status="queued",
        started=utc_now(),
        model=config.gemini_model,
    )
    with _lock:
        _runs[run_id] = record

    def worker() -> None:
        with _lock:
            if run_id in _cancel:
                return
            _runs[run_id].status = "running"
        try:
            result = run_all(config)
            with _lock:
                rec = _runs[run_id]
                if run_id in _cancel:
                    rec.status = "cancelled"
                else:
                    rec.status = "completed" if not result.errors else "failed"
                rec.finished = utc_now()
                rec.scouted = result.scouted
                rec.shortlisted = result.shortlisted
                rec.skipped = result.skipped
                rec.written = result.written
                rec.write_skipped = result.write_skipped
                rec.errors = list(result.errors)
                rec.model = result.model
                rec.preview = f"scouted={result.scouted} shortlisted={result.shortlisted} written={result.written}"
                final = RunRecord(**rec.__dict__)
            if on_done:
                on_done(final)
        except Exception as exc:  # noqa: BLE001
            with _lock:
                rec = _runs[run_id]
                rec.status = "failed"
                rec.finished = utc_now()
                rec.errors = [str(exc)]

    threading.Thread(target=worker, daemon=True).start()
    return record
