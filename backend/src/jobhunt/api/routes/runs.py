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
from jobhunt.api.schemas.runs import RunLogSummary, RunStartRequest
from jobhunt.features.write.preflight import data_dir_problem, run_preflight
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
    trigger: str = "api"


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
    stage: str | None = None
    write_cap: int | None = None
    trigger: str = "api"


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
        stage=rec.stage,
        write_cap=rec.write_cap,
        trigger=rec.trigger,
    )


def _stored_runs(store: Any) -> list[RunRecord]:
    lister = getattr(store, "list_run_notes", None)
    return list(lister()) if callable(lister) else []


def _is_day_note(rec: RunRecord) -> bool:
    return bool(_DAY_NOTE_ID.match(rec.id))


def _settle_stale(store: Any, rec: RunRecord) -> RunRecord:
    """A stored run still queued/running with a stale heartbeat is reported as failed.

    Purpose: B3/B4 - mark it ``interrupted`` and keep the legacy ``interrupted: ...`` error.
    Inputs: A stored ``RunRecord`` (never a live in-memory one).
    Returns: Unchanged, or a copy with status ``failed``, ``interrupted=True``, error appended.
    Does not: Require the store write to succeed for the response flag (list may have persisted earlier).
    """

    settle = getattr(store, "settle_stale_active_runs", None)
    if callable(settle):
        settle()

    if rec.status in ACTIVE_STATUSES:
        from jobhunt.store.sqlite.store import HEARTBEAT_STALE_SECONDS, _heartbeat_age_seconds

        age = _heartbeat_age_seconds(rec.heartbeat)
        if age is None or age > HEARTBEAT_STALE_SECONDS:
            errors = list(rec.errors)
            if _INTERRUPTED not in errors:
                errors.append(_INTERRUPTED)
            return replace(
                rec, status="failed", errors=errors, interrupted=True, stage=None
            )
        return rec

    # Already persisted as failed by settle_stale_active_runs — still surface the flag.
    if rec.status == "failed" and any(err.startswith("interrupted:") for err in rec.errors):
        return replace(rec, interrupted=True, stage=None)
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
        stage=rec.stage,
        trigger=rec.trigger,
    )


def _resolve_run_cv_text(store: Any, cv_id: str | None) -> str:
    """Resolve CV text for a run: explicit document id or active CV.

    Purpose: M2 — optional ``cv`` on ``POST /runs`` selects one document for the whole run.
    Inputs: App store; optional document id (must be kind ``cv`` when set).
    Returns: Extracted CV text (may be empty).
    Does not: Return CV text on list/GET document routes; mix two CVs.
    """

    if cv_id:
        meta = store.get_document(cv_id)
        if meta is None:
            raise HTTPException(status_code=404, detail=f"CV document not found: {cv_id}")
        if meta.kind != "cv":
            raise HTTPException(status_code=404, detail=f"Document is not a CV: {cv_id}")
        return store.document_text(cv_id) or ""
    return store.read_cv()


@router.get("/runs/preflight")
def get_run_preflight(request: Request) -> dict[str, Any]:
    """Writer availability and data-dir writability, for the UI before Run Now."""
    config = get_config(request)
    return run_preflight(config, config.native_data_path)


@router.post(
    "/runs",
    response_model=AsyncRunAccepted,
    responses={
        409: {"description": "Another run is queued or running"},
        404: {"description": "CV document missing or not kind cv"},
    },
)
def start_run(request: Request, body: RunStartRequest | None = None) -> AsyncRunAccepted:
    """Start a pipeline run in the background; optional ``{cv}``; 409 while one is active."""

    config = get_config(request)
    problem = data_dir_problem(config.native_data_path)
    if problem:
        raise HTTPException(status_code=503, detail=problem)
    store = get_app_store(request)
    cv_text = _resolve_run_cv_text(store, body.cv if body else None)

    def persist(rec: RunRecord) -> None:
        upsert = getattr(store, "upsert_run_status", None)
        if callable(upsert):
            upsert(rec)

    try:
        record = start_async_run(
            config, store=store, on_update=persist, trigger="api", cv_text=cv_text
        )
    except RunConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"A pipeline run is already active: {exc.run_id}",
        ) from exc
    return AsyncRunAccepted(id=record.id, status=record.status, started=record.started, model=record.model, trigger=record.trigger)


@router.get("/runs/{run_id}", response_model=AsyncRunStatus)
def get_run_status(run_id: str, request: Request) -> AsyncRunStatus:
    """Live status from memory, else the stored row (survives a server restart)."""

    rec = get_run(run_id)
    store = get_app_store(request)

    if rec is None:
        stored = next((r for r in _stored_runs(store) if r.id == run_id), None)
        if stored is not None:
            rec = _settle_stale(store, stored)
        else:
            raise HTTPException(status_code=404, detail="Run not found")
    if rec is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return _status_out(rec)


@router.post("/runs/{run_id}/cancel")
def cancel_run(run_id: str, request: Request) -> dict[str, bool]:
    store = get_app_store(request)

    # Try to cancel via runner first
    ok = request_cancel(run_id)

    # If not found in memory, try store
    if not ok:
        request_cancel_store = getattr(store, "request_run_cancel", None)
        if callable(request_cancel_store):
            ok = request_cancel_store(run_id)

    if not ok:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"cancelled": True}


@router.get("/runs", response_model=list[RunLogSummary])
def list_runs(request: Request) -> list[RunLogSummary]:
    """One row per run id (live wins), plus day notes that match no stored run, newest first."""

    store = get_app_store(request)
    data_path = str(store.data_path())

    settle_stale = getattr(store, "settle_stale_active_runs", None)
    if callable(settle_stale):
        settle_stale()

    live = {rec.id: rec for rec in list_async_runs()}
    stored = _stored_runs(store)
    runs: dict[str, RunRecord] = {
        rec.id: _settle_stale(store, rec) for rec in stored if not _is_day_note(rec)
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
