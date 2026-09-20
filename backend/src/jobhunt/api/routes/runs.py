"""Pipeline run routes — async start + list.

Purpose: Start scout → match → write without blocking the browser.
Inputs: AppConfig; background runner.
Returns: Run id immediately; poll ``GET /runs/{id}``.
Does not: Auto-submit applications or hide crawl denials.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict

from jobhunt.api.app import get_app_store, get_config
from jobhunt.api.runner import get_run, list_async_runs, request_cancel, start_async_run
from jobhunt.api.schemas.runs import RunLogSummary, RunResponse
from jobhunt.store.types import RunRecord

router = APIRouter(tags=["runs"])

_PREVIEW_CHARS = 500


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
    )


@router.post("/runs", response_model=AsyncRunAccepted)
def start_run(request: Request) -> AsyncRunAccepted:
    """Accept a pipeline run and execute it in the background."""

    config = get_config(request)
    store = get_app_store(request)

    def persist(rec: RunRecord) -> None:
        upsert = getattr(store, "upsert_run_status", None)
        if callable(upsert):
            upsert(rec)

    record = start_async_run(config, on_done=persist)
    return AsyncRunAccepted(id=record.id, status=record.status, started=record.started, model=record.model)


@router.get("/runs/{run_id}", response_model=AsyncRunStatus)
def get_run_status(run_id: str) -> AsyncRunStatus:
    rec = get_run(run_id)
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
    """List run-log summaries from the store (plus in-flight async runs)."""

    store = get_app_store(request)
    rows: list[RunLogSummary] = []
    for rec in list_async_runs():
        rows.append(
            RunLogSummary(
                date=rec.id,
                path=f"async:{rec.id}",
                preview=rec.preview[:_PREVIEW_CHARS] or rec.status,
                has_errors=bool(rec.errors),
            )
        )
    for rec in store.list_run_notes():
        rows.append(
            RunLogSummary(
                date=rec.id,
                path=str(store.data_path()),
                preview=(rec.preview or "")[:_PREVIEW_CHARS],
                has_errors=bool(rec.errors),
            )
        )
    return rows
