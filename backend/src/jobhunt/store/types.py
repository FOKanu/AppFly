"""Shared store record types.

Purpose: Metadata shapes for documents, letters, and runs without CV bodies.
Inputs: Constructed by Markdown or SQLite adapters.
Returns: Dataclasses used by protocols and HTTP schemas.
Does not: Read disk, return API keys, or embed CV markdown in list APIs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

DocumentKind = Literal["cv", "voice", "cert", "portfolio", "inbox", "other"]
ExtractStatus = Literal["ok", "empty", "unsupported", "error"]


@dataclass
class DocumentMeta:
    """One user document in the Vault library.

    Purpose: List/upload metadata without body bytes.
    Inputs: Store row fields.
    Returns: Dataclass for API and UI.
    Does not: Include extracted text or original file bytes.
    """

    id: str
    kind: DocumentKind
    label: str
    mime: str = "application/octet-stream"
    word_count: int = 0
    active_cv: bool = False
    active_voice: bool = False
    created_at: str = ""
    updated_at: str = ""
    original_name: str = ""
    extract_status: ExtractStatus = "empty"


@dataclass
class LetterRecord:
    """Cover letter for one job.

    Purpose: Full letter body for Packet edit/save.
    Inputs: source_id and markdown/text body.
    Returns: Dataclass.
    Does not: Include CV or other jobs.
    """

    source_id: str
    body: str
    model: str = ""
    tokens_in: int = 0
    tokens_out: int = 0
    updated_at: str = ""


@dataclass
class RunRecord:
    """One pipeline run summary.

    Purpose: Activity list and async run status.
    Inputs: Store or in-memory runner.
    Returns: Dataclass.
    Does not: Include secrets or CV text.
    """

    id: str
    status: str  # queued | running | completed | completed_with_errors | failed | cancelled
    started: str = ""
    finished: str = ""
    scouted: int = 0
    shortlisted: int = 0
    skipped: int = 0
    written: int = 0
    write_skipped: int = 0
    errors: list[str] = field(default_factory=list)
    model: str = ""
    preview: str = ""
    # B3: true when a stored queued/running run was settled as stale on read (status is then "failed").
    # Computed at read time, not stored in the runs table.
    interrupted: bool = False
    # B1: current stage while running ("scout" | "match" | "write"); None when queued or finished.
    # Kept in memory only, not stored in the runs table.
    stage: str | None = None
    # B1: letter cap for this run (config letter_cap); None when unknown (for example read back from the store).
    write_cap: int | None = None
    # B4: trigger source ("api", "cli", or "nightly")
    trigger: str = "api"
    # B4: process owner ID (empty for unowned)
    owner: str = ""
    # B4: last heartbeat timestamp (empty when not set)
    heartbeat: str = ""
    # B4: true when cancel was requested by another process
    cancel_requested: bool = False


@dataclass
class JobNote:
    """Vault-compatible job note for match/write.

    Purpose: Mimic frontmatter.Post (.metadata / .content) without requiring Markdown.
    Inputs: Store fields.
    Returns: Object usable by ``Vault.job_from_note``-style helpers.
    Does not: Fetch listings.
    """

    metadata: dict[str, Any]
    content: str = ""


@dataclass
class WorkspaceReadiness:
    """First-run checklist.

    Purpose: Tell the UI what is still missing before Run Now.
    Inputs: Store + config + secret flags.
    Returns: Booleans and paths.
    Does not: Create files.
    """

    storage_backend: str
    data_path: str
    has_cv: bool
    has_voice: bool
    has_gemini: bool
    has_keywords: bool
    job_count: int = 0


def utc_now() -> str:
    """ISO timestamp for store rows."""

    return datetime.now().astimezone().isoformat(timespec="seconds")
