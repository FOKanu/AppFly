"""Job queue routes backed by vault notes.

Purpose: List, show, and status-patch jobs the CLI already stores.
Inputs: Vault job notes; PATCH body is ``status`` only.
Returns: Summaries or a single-job packet with a letter excerpt.
Does not: Fetch listing URLs, return CV master, or expose connector secrets.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import frontmatter
from fastapi import APIRouter, HTTPException, Request

from jobhunt.api.app import get_config, get_vault
from jobhunt.api.schemas.jobs import JobPacket, JobStatusPatch, JobSummary
from jobhunt.models import STATUSES
from jobhunt.vault import Vault

router = APIRouter(tags=["jobs"])

_LETTER_EXCERPT_CHARS = 600


@router.get("/jobs", response_model=list[JobSummary])
def list_jobs(request: Request, status: str | None = None) -> list[JobSummary]:
    """List job notes for the Queue UI.

    Purpose: Read vault jobs, optional status filter.
    Inputs: Query ``status`` must be a ``STATUSES`` value when set.
    Returns: Job summaries (no descriptions, no CV).
    Does not: Fetch listing URLs or return connector secrets.
    """

    _require_known_status(status)
    vault = get_vault(request)
    summaries = [_summary_from_note(post) for post in vault.iter_job_notes()]
    if status is None:
        return summaries
    return [row for row in summaries if row.status == status]


@router.get("/jobs/{source_id}", response_model=JobPacket)
def get_job(source_id: str, request: Request) -> JobPacket:
    """Return one job packet for the detail pane.

    Purpose: Show a single vault job plus a letter excerpt when present.
    Inputs: ``source_id`` from the job note frontmatter.
    Returns: Job fields and truncated description/letter excerpts.
    Does not: Return CV master, other jobs, or the whole vault.
    """

    vault = get_vault(request)
    config = get_config(request)
    post = _find_job_note(vault, source_id)
    if post is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    excerpt_chars = config.jd_excerpt_chars
    return _packet_from_note(vault, post, excerpt_chars=excerpt_chars)


@router.patch("/jobs/{source_id}", response_model=JobSummary)
def patch_job(source_id: str, body: JobStatusPatch, request: Request) -> JobSummary:
    """Update only the status field on a job note.

    Purpose: Let the UI mark jobs approved, applied, skipped, etc.
    Inputs: ``source_id`` and ``{status}`` from ``STATUSES``.
    Returns: Updated job summary.
    Does not: Change scores, letters, or crawl the listing URL.
    """

    _require_known_status(body.status)
    vault = get_vault(request)
    path = vault.update_job_meta(source_id, status=body.status)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    vault.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
    post = _find_job_note(vault, source_id)
    if post is None:
        raise HTTPException(status_code=404, detail=f"Job {source_id} not found")
    return _summary_from_note(post)


def _require_known_status(status: str | None) -> None:
    """Reject statuses the vault does not use.

    Purpose: Keep PATCH/filter values aligned with ``models.STATUSES``.
    Inputs: Optional status string.
    Returns: None.
    Does not: Write the vault.
    """

    if status is None:
        return
    if status not in STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of {list(STATUSES)}",
        )


def _find_job_note(vault: Vault, source_id: str) -> frontmatter.Post | None:
    """Load the job note for a source_id.

    Purpose: Shared lookup for GET and PATCH.
    Inputs: Vault and source_id.
    Returns: Frontmatter post or None.
    Does not: Fetch remote listings.
    """

    for post in vault.iter_job_notes():
        if str(post.metadata.get("source_id") or "") == source_id:
            return post
    return None


def _summary_from_note(post: frontmatter.Post) -> JobSummary:
    """Map a job note to a queue row.

    Purpose: Flatten frontmatter into a secret-free summary.
    Inputs: Parsed Jobs/*.md post.
    Returns: ``JobSummary``.
    Does not: Include description body or CV.
    """

    meta = post.metadata
    letter = str(meta.get("letter") or "").strip()
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
    )


def _packet_from_note(
    vault: Vault,
    post: frontmatter.Post,
    *,
    excerpt_chars: int,
) -> JobPacket:
    """Build a UI packet for one job.

    Purpose: One job's fields plus truncated excerpts.
    Inputs: Vault (for the letter file), job post, excerpt length.
    Returns: ``JobPacket``.
    Does not: Attach CV, voice samples, or other jobs.
    """

    summary = _summary_from_note(post)
    description = (post.content or "").strip()
    letter_ref = str(post.metadata.get("letter") or "").strip()
    letter_excerpt = _letter_excerpt(vault, letter_ref)
    return JobPacket(
        source_id=summary.source_id,
        source=summary.source,
        title=summary.title,
        company=summary.company,
        status=summary.status,
        location=summary.location,
        url=summary.url,
        salary=str(post.metadata.get("salary") or ""),
        lang=str(post.metadata.get("lang") or ""),
        score=summary.score,
        crawl_allowed=summary.crawl_allowed,
        description_excerpt=description[:excerpt_chars],
        letter_excerpt=letter_excerpt,
        has_letter=letter_excerpt is not None or summary.has_letter,
    )


def _letter_excerpt(vault: Vault, letter_ref: str) -> str | None:
    """Read a short slice of the linked letter note.

    Purpose: Show draft text in the UI without dumping Letters/.
    Inputs: Vault and a wikilink such as ``[[Letters/stem]]``.
    Returns: Truncated letter body, or None if missing.
    Does not: Return CV master or other letters.
    """

    if not letter_ref or letter_ref in {"None", "null"}:
        return None
    target = _wikilink_target(letter_ref)
    stem = target.split("/")[-1]
    if not stem:
        return None
    path = vault.letters_dir / f"{stem}.md"
    if not path.exists():
        return None
    post = frontmatter.loads(path.read_text(encoding="utf-8"))
    body = (post.content or "").strip()
    if not body:
        return None
    return body[:_LETTER_EXCERPT_CHARS]


def _wikilink_target(value: str) -> str:
    """Extract the path side of an Obsidian wikilink.

    Purpose: Resolve ``[[Letters/stem|label]]`` to ``Letters/stem``.
    Inputs: Raw frontmatter string.
    Returns: Target path or the original string.
    Does not: Read files.
    """

    text = value.strip()
    match = re.match(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", text)
    if match:
        return match.group(1).strip()
    return text


def _display_company(value: Any) -> str:
    """Human company name from a wikilink or plain string.

    Purpose: Queue rows should show “SAP”, not ``[[Companies/sap|SAP]]``.
    Inputs: Frontmatter ``company`` value.
    Returns: Display name.
    Does not: Read company notes.
    """

    text = str(value or "").strip()
    labeled = re.match(r"\[\[(?:.+\|)?(.+)\]\]", text)
    if labeled:
        return labeled.group(1).strip()
    return text or "Unknown"


def _as_score(value: Any) -> float | None:
    """Parse a numeric score from YAML frontmatter.

    Purpose: Normalize empty YAML nulls to JSON null.
    Inputs: Raw metadata value.
    Returns: Float or None.
    Does not: Recompute matching scores.
    """

    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_bool(value: Any, *, default: bool) -> bool:
    """Coerce YAML bool-ish values.

    Purpose: ``crawl: false`` must survive round-trip to JSON.
    Inputs: Raw metadata value and a default.
    Returns: Boolean.
    Does not: Change the note.
    """

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
