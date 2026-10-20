"""Job queue routes backed by AppStore.

Purpose: List, show, status-patch, and letter save/regenerate for jobs.
Inputs: AppStore job + letter records.
Returns: Summaries, packets with full letter_body, letter write results.
Does not: Fetch listing URLs, return CV master, or expose connector secrets.
"""

# Route order is load-bearing: with {source_id:path}, the /letter routes must be
# registered before GET/PATCH /jobs/{source_id:path} (first full match wins).
# An id ending in "/letter" is ambiguous and routes to the letter endpoint (accepted).

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from jobhunt.api.app import get_app_store, get_config
from jobhunt.api.schemas.jobs import JobPacket, JobStatusPatch, JobSummary, LetterPut
from jobhunt.models import STATUSES
from jobhunt.store.types import JobNote

router = APIRouter(tags=["jobs"])

_REGEN_STATUS = {"missing_key": 400, "key_rejected": 400, "rate_limited": 429, "upstream": 502}
_LETTER_EXCERPT_CHARS = 600


@router.get("/jobs", response_model=list[JobSummary])
def list_jobs(request: Request, status: str | None = None) -> list[JobSummary]:
    _require_known_status(status)
    store = get_app_store(request)
    summaries = [_summary_from_note(note) for note in store.iter_job_notes()]
    if status is None:
        return summaries
    return [row for row in summaries if row.status == status]




@router.post("/jobs/{source_id:path}/letter/regenerate")
def regenerate_letter(source_id: str, request: Request) -> dict[str, Any]:
    """Force-write a letter for one job (ignores existing letter skip)."""

    from jobhunt.features.write.letters import regenerate_letter_for_job, LetterWriteError

    store = get_app_store(request)
    config = get_config(request)
    note = _find_note(store, source_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    job = store.job_from_note(note)
    try:
        letter = regenerate_letter_for_job(config, store, job)
    except LetterWriteError as exc:
        raise HTTPException(status_code=_REGEN_STATUS[exc.kind], detail=str(exc)) from exc
    return {
        "source_id": source_id,
        "body": letter,
        "model": config.gemini_model,
    }


# Route order is load-bearing: with {source_id:path}, the /letter routes must be
# registered before GET/PATCH /jobs/{source_id:path} (first full match wins).
# An id ending in "/letter" is ambiguous and routes to the letter endpoint (accepted).
@router.get("/jobs/{source_id:path}/letter")
def get_letter(source_id: str, request: Request) -> dict[str, Any]:
    store = get_app_store(request)
    letter = store.get_letter(source_id)
    if letter is None:
        raise HTTPException(status_code=404, detail="Letter not found")
    return {
        "source_id": letter.source_id,
        "body": letter.body,
        "model": letter.model,
        "tokens_in": letter.tokens_in,
        "tokens_out": letter.tokens_out,
        "updated_at": letter.updated_at,
    }


@router.put("/jobs/{source_id:path}/letter")
def put_letter(source_id: str, body: LetterPut, request: Request) -> dict[str, Any]:
    store = get_app_store(request)
    if _find_note(store, source_id) is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    try:
        letter = store.save_letter_body(source_id, body.body)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {
        "source_id": letter.source_id,
        "body": letter.body,
        "model": letter.model,
        "updated_at": letter.updated_at,
    }


@router.get("/jobs/{source_id:path}", response_model=JobPacket)
def get_job(source_id: str, request: Request) -> JobPacket:
    store = get_app_store(request)
    config = get_config(request)
    note = _find_note(store, source_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    return _packet_from_note(store, note, excerpt_chars=config.jd_excerpt_chars)


@router.patch("/jobs/{source_id:path}", response_model=JobSummary)
def patch_job(source_id: str, body: JobStatusPatch, request: Request) -> JobSummary:
    _require_known_status(body.status)
    store = get_app_store(request)
    path = store.update_job_meta(source_id, status=body.status)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    store.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
    note = _find_note(store, source_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    return _summary_from_note(note)


def _require_known_status(status: str | None) -> None:
    if status is None:
        return
    if status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {list(STATUSES)}")


def _find_note(store: Any, source_id: str) -> JobNote | None:
    for note in store.iter_job_notes():
        if str(note.metadata.get("source_id") or "") == source_id:
            return note
    return None


def _summary_from_note(note: JobNote) -> JobSummary:
    meta = note.metadata
    letter = str(meta.get("letter") or meta.get("letter_path") or "").strip()
    return JobSummary(
        source_id=str(meta.get("source_id") or ""),
        source=str(meta.get("source") or "unknown"),
        title=str(meta.get("title") or "Untitled"),
        company=_display_company(meta.get("company")),
        status=str(meta.get("status") or "inbox"),
        location=str(meta.get("location") or ""),
        url=str(meta.get("url") or ""),
        score=_as_score(meta.get("score")),
        has_letter=bool(letter and letter not in {"None", "null"}),
        crawl_allowed=_as_bool(meta.get("crawl"), default=True),
        skip_reason=meta.get("skip_reason"),
    )


def _packet_from_note(store: Any, note: JobNote, *, excerpt_chars: int) -> JobPacket:
    summary = _summary_from_note(note)
    description = (note.content or "").strip()
    letter = store.get_letter(summary.source_id)
    body = letter.body if letter else None
    excerpt = body[:_LETTER_EXCERPT_CHARS] if body else None
    return JobPacket(
        source_id=summary.source_id,
        source=summary.source,
        title=summary.title,
        company=summary.company,
        status=summary.status,
        location=summary.location,
        url=summary.url,
        salary=str(note.metadata.get("salary") or ""),
        lang=str(note.metadata.get("lang") or ""),
        score=summary.score,
        crawl_allowed=summary.crawl_allowed,
        description_excerpt=description[:excerpt_chars],
        letter_excerpt=excerpt,
        letter_body=body,
        has_letter=bool(body) or summary.has_letter,
        skip_reason=summary.skip_reason,
    )


def _display_company(value: Any) -> str:
    text = str(value or "").strip()
    labeled = re.match(r"\[\[(?:.+\|)?(.+)\]\]", text)
    if labeled:
        return labeled.group(1).strip()
    return text or "Unknown"


def _as_score(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_bool(value: Any, *, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().casefold()
    if text in {"false", "0", "no"}:
        return False
    if text in {"true", "1", "yes"}:
        return True
    return default
