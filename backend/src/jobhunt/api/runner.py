"""In-process async pipeline runner.

Purpose: Non-blocking POST /runs with status polling, one active run at a time.
Inputs: AppConfig, the app store, and an ``on_update`` persistence callback.
Returns: ``RunRecord`` snapshots; every status transition is passed to ``on_update``.
Does not: Interrupt a Gemini call in flight (cancel is checked between stages and letters).
"""

from __future__ import annotations

import logging
import os
import socket
import threading
import uuid
from collections.abc import Callable
from dataclasses import replace
from typing import Any

from jobhunt.config import AppConfig
from jobhunt.features.pipeline.run_all import run_all
from jobhunt.store.types import RunRecord, utc_now

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = frozenset({"queued", "running"})
# B1: the only fields the pipeline may change while running.
_PROGRESS_FIELDS = frozenset({"stage", "scouted", "shortlisted", "skipped", "written", "write_skipped"})

_lock = threading.Lock()
_runs: dict[str, RunRecord] = {}
_cancel_events: dict[str, threading.Event] = {}

OnUpdate = Callable[[RunRecord], None]


class RunConflictError(RuntimeError):
    """Raised when a run is requested while another one is queued or running."""

    def __init__(self, run_id: str) -> None:
        super().__init__(f"Run {run_id} is already active")
        self.run_id = run_id


def get_run(run_id: str) -> RunRecord | None:
    with _lock:
        rec = _runs.get(run_id)
        return _snapshot(rec) if rec is not None else None


def list_async_runs() -> list[RunRecord]:
    with _lock:
        return [_snapshot(rec) for rec in _runs.values()]


def reset_runs() -> None:
    """Forget in-memory runs (tests and app restarts only)."""

    with _lock:
        _runs.clear()
        _cancel_events.clear()


def request_cancel(run_id: str) -> bool:
    """Ask an in-process run to stop at its next checkpoint.

    Purpose: Set the cooperative cancel event for a RAM-owned run.
    Inputs: Run id.
    Returns: True if the id is in this process; False otherwise (caller may try the store).
    Does not: Touch the SQLite cancel flag — routes call ``request_run_cancel`` for that.
    """

    with _lock:
        if run_id not in _runs:
            return False
        event = _cancel_events.get(run_id)
        if event is not None:
            event.set()
        return True


def _snapshot(rec: RunRecord) -> RunRecord:
    return replace(rec, errors=list(rec.errors))


def _notify(on_update: OnUpdate | None, rec: RunRecord) -> None:
    if on_update is None:
        return
    try:
        on_update(rec)
    except Exception:
        logger.exception("Could not persist run %s", rec.id)


def _update(run_id: str, on_update: OnUpdate | None, **changes: Any) -> None:
    with _lock:
        rec = _runs[run_id]
        for key, value in changes.items():
            setattr(rec, key, value)
        snap = _snapshot(rec)
    _notify(on_update, snap)


def start_async_run(
    config: AppConfig,
    *,
    store: Any = None,
    on_update: OnUpdate | None = None,
    trigger: str = "api",
) -> RunRecord:
    """Queue a background ``run_all`` and return the queued record immediately.

    Raises ``RunConflictError`` when another run is queued or running.
    """

    run_id = uuid.uuid4().hex[:12]
    event = threading.Event()

    # Check for existing active runs in store
    if store is not None:
        settle_stale = getattr(store, "settle_stale_active_runs", None)
        if callable(settle_stale):
            settled_ids = settle_stale()
            logger.debug("Settled stale runs: %s", settled_ids)

        find_active = getattr(store, "find_active_run", None)
        if callable(find_active):
            active_run = find_active()
            if active_run is not None:
                raise RunConflictError(active_run.id)

    with _lock:
        for existing in _runs.values():
            if existing.status in ACTIVE_STATUSES:
                raise RunConflictError(existing.id)

        # Set owner to hostname:pid
        owner = f"{socket.gethostname()}:{os.getpid()}"

        record = RunRecord(
            id=run_id,
            status="queued",
            started=utc_now(),
            model=config.gemini_model,
            write_cap=config.letter_cap,
            trigger=trigger,
            owner=owner,
            heartbeat=utc_now(),
        )
        _runs[run_id] = record
        _cancel_events[run_id] = event
        queued = _snapshot(record)
    _notify(on_update, queued)

    def progress(**changes: Any) -> None:
        """Record live stage and counts for this run.

        Purpose: B1 - let GET /runs/{id} show the stage and counts while the run is going.
        Inputs: Keyword changes from the pipeline (stage, scouted, shortlisted, skipped, written, write_skipped).
        Returns: None; the change is persisted through ``on_update`` like any transition.
        Does not: Change status, errors or timestamps; unknown keys are ignored.
        """

        if store is not None:
            check_cancel = getattr(store, "is_run_cancel_requested", None)
            if callable(check_cancel) and check_cancel(run_id):
                event.set()
        allowed = {key: value for key, value in changes.items() if key in _PROGRESS_FIELDS}
        if allowed:
            _update(run_id, on_update, **allowed)

    def worker() -> None:
        if event.is_set():
            _update(run_id, on_update, status="cancelled", finished=utc_now(), stage=None)
            return
        _update(run_id, on_update, status="running")

        # Start heartbeat thread for this run
        def heartbeat_thread():
            while True:
                # Check if we should stop
                if event.is_set():
                    break

                # Update heartbeat in store if available
                if store is not None:
                    touch_heartbeat = getattr(store, "touch_run_heartbeat", None)
                    if callable(touch_heartbeat):
                        try:
                            touch_heartbeat(run_id)
                        except Exception:
                            logger.exception("Failed to update heartbeat for run %s", run_id)

                # Wait 10 seconds before next heartbeat
                event.wait(timeout=10.0)

        heartbeat = threading.Thread(target=heartbeat_thread, daemon=True)
        heartbeat.start()

        try:
            result = run_all(config, store, cancel=event, on_progress=progress)
        except Exception as exc:  # noqa: BLE001 - a crashed run must still be recorded
            _update(
                run_id,
                on_update,
                status="failed",
                finished=utc_now(),
                stage=None,
                errors=[f"{type(exc).__name__}: {exc}"],
            )
            return
        if result.cancelled:
            status = "cancelled"
        elif result.errors:
            status = "completed_with_errors"
        else:
            status = "completed"
        _update(
            run_id,
            on_update,
            status=status,
            finished=utc_now(),
            stage=None,
            scouted=result.scouted,
            shortlisted=result.shortlisted,
            skipped=result.skipped,
            written=result.written,
            write_skipped=result.write_skipped,
            errors=list(result.errors),
            model=result.model,
            preview=(
                f"scouted={result.scouted} shortlisted={result.shortlisted} "
                f"written={result.written}"
            ),
        )

        # Clean up heartbeat thread
        event.set()
        heartbeat.join(timeout=1.0)

    threading.Thread(target=worker, name=f"run-{run_id}", daemon=True).start()
    return queued
