"""Pipeline run routes — async start + list.

Purpose: Start scout → match → write without blocking the browser.
Inputs: AppConfig; background runner.
Returns: Run id immediately; poll ``GET /runs/{id}``.
Does not: Auto-submit applications or hide crawl denials.
"""

from __future__ import annotations

import re
from dataclasses import replace
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from jobhunt.api.app import get_app_store, get_config
from jobhunt.api.runner import (
    ACTIVE_STATUSES,
    RunConflictError,
    get_run,
    list_async_runs,
    request_cancel,
    start_async_run,
)
from jobhunt.api.schemas.runs import RunLogSummary, RunResponse
from jobhunt.store.types import RunRecord

router = APIRouter(tags=["runs"])

_PREVIEW_CHARS = 500
_DAY_NOTE_ID = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_INTERRUPTED = "interrupted: the server stopped before this run finished"


class AsyncRunAccepted(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: str
    started: str = ""
    model: str = ""


class AsyncRunStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    status: str
    started: str = ""
    finished: str = ""
    scouted: int = 0
    shortlisted: int = 0
    skipped: int = 0
    written: int = 0
    write_skipped: int = 0
    errors: list[str] = []
    model: str = ""
    preview: str = ""
    interrupted: bool = False


def _status_out(rec: RunRecord) -> AsyncRunStatus:
    return AsyncRunStatus(
        id=rec.id,
        status=rec.status,
        started=rec.started,
        finished=rec.finished,
        scouted=rec.scouted,
        shortlisted=rec.shortlisted,
        skipped=rec.skipped,
        written=rec.written,
        write_skipped=rec.write_skipped,
        errors=list(rec.errors),
        model=rec.model,
        preview=rec.preview,
        interrupted=rec.interrupted,
    )


def _stored_runs(store: Any) -> list[RunRecord]:
    lister = getattr(store, "list_run_notes", None)
    return list(lister()) if callable(lister) else []


def _is_day_note(rec: RunRecord) -> bool:
    return bool(_DAY_NOTE_ID.match(rec.id))


def _settle_stale(rec: RunRecord) -> RunRecord:
    """A stored run still queued/running from a previous process is reported as failed.

    Purpose: B3 - mark it ``interrupted`` and keep the legacy ``interrupted: ...`` error for older clients.
    Inputs: A stored ``RunRecord`` (never a live in-memory one).
    Returns: The record unchanged, or a copy with status ``failed``, ``interrupted=True`` and the error appended.
    Does not: Write the settled state back to the store.
    """

    if rec.status in ACTIVE_STATUSES:
        return replace(rec, status="failed", errors=[*rec.errors, _INTERRUPTED], interrupted=True)
    return rec


def _summary(rec: RunRecord, *, path: str) -> RunLogSummary:
    day_note = _is_day_note(rec)
    counts = (
        {}
        if day_note
        else {"scouted": rec.scouted, "matched": rec.shortlisted, "written": rec.written}
    )
    return RunLogSummary(
        date=rec.id,
        path=path,
        preview=(rec.preview or rec.status)[:_PREVIEW_CHARS],
        has_errors=bool(rec.errors),
        id=rec.id,
        kind="day_note" if day_note else "run",
        status=rec.status,
        started_at=rec.started,
        finished_at=rec.finished,
        counts=counts,
        error_count=len(rec.errors),
        interrupted=rec.interrupted,
    )


@router.post(
    "/runs",
    response_model=AsyncRunAccepted,
    responses={409: {"description": "Another run is queued or running"}},
)
def start_run(request: Request) -> AsyncRunAccepted:
    """Start a pipeline run in the background (no request body); 409 while one is active."""

    config = get_config(request)
    store = get_app_store(request)

    def persist(rec: RunRecord) -> None:
        upsert = getattr(store, "upsert_run_status", None)
        if callable(upsert):
            upsert(rec)

    try:
        record = start_async_run(config, store=store, on_update=persist)
    except RunConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"A pipeline run is already active: {exc.run_id}",
        ) from exc
    return AsyncRunAccepted(id=record.id, status=record.status, started=record.started, model=record.model)


@router.get("/runs/{run_id}", response_model=AsyncRunStatus)
def get_run_status(run_id: str, request: Request) -> AsyncRunStatus:
    """Live status from memory, else the stored row (survives a server restart)."""

    rec = get_run(run_id)
    if rec is None:
        stored = next((r for r in _stored_runs(get_app_store(request)) if r.id == run_id), None)
        rec = _settle_stale(stored) if stored is not None else None
    if rec is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return _status_out(rec)


@router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str) -> dict[str, bool]:
    ok = request_cancel(run_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"cancelled": True}


@router.get("/runs", response_model=list[RunLogSummary])
def list_runs(request: Request) -> list[RunLogSummary]:
    """One row per run id (live wins), plus day notes that match no stored run, newest first."""

    store = get_app_store(request)
    data_path = str(store.data_path())
    live = {rec.id: rec for rec in list_async_runs()}
    stored = _stored_runs(store)
    runs: dict[str, RunRecord] = {
        rec.id: _settle_stale(rec) for rec in stored if not _is_day_note(rec)
    }
    runs.update(live)
    run_days = {rec.started[:10] for rec in runs.values() if rec.started}
    rows = [
        _summary(rec, path=f"async:{rec.id}" if rec.id in live else data_path)
        for rec in runs.values()
    ]
    rows.extend(
        _summary(rec, path=data_path)
        for rec in stored
        if _is_day_note(rec) and rec.id not in run_days
    )
    rows.sort(key=lambda row: row.started_at or row.date, reverse=True)
    return rows
