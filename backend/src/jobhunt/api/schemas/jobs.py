"""Job list, packet, and status-patch DTOs.

Purpose: Vault-backed job shapes for the Queue UI.
Inputs: Built from job notes; PATCH accepts ``status`` only.
Returns: Summaries and a sealed-style packet (one job + letter excerpt).
Does not: Include CV master, other jobs, API keys, or last-4 digits.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class JobSummary(BaseModel):
    """One row for the jobs queue.

    Purpose: List vault job notes without the full description or CV.
    Inputs: Frontmatter fields from a Jobs/*.md note.
    Returns: Identifiers, status, and score for filtering.
    Does not: Fetch the listing URL or return letters/CV.
    """

    model_config = ConfigDict(extra="forbid")

    source_id: str
    source: str
    title: str
    company: str
    status: str
    location: str = ""
    url: str = ""
    score: float | None = None
    has_letter: bool = False
    crawl_allowed: bool = True
    skip_reason: str | None = None


class JobPacket(BaseModel):
    """Single-job payload for the detail pane.

    Purpose: Show one job plus a short letter excerpt when a draft exists.
    Inputs: One job note and, optionally, its Letters/*.md file.
    Returns: Job fields and truncated excerpts.
    Does not: Return CV master, voice samples, or the rest of the vault.
    """

    model_config = ConfigDict(extra="forbid")

    source_id: str
    source: str
    title: str
    company: str
    status: str
    location: str = ""
    url: str = ""
    salary: str = ""
    lang: str = ""
    score: float | None = None
    crawl_allowed: bool = True
    description_excerpt: str = ""
    letter_excerpt: str | None = None
    letter_body: str | None = None
    has_letter: bool = False
    skip_reason: str | None = None


class JobStatusPatch(BaseModel):
    """Body for PATCH /jobs/{source_id}.

    Purpose: Allow the UI to set vault ``status`` only.
    Inputs: ``status`` must be one of ``jobhunt.models.STATUSES``.
    Returns: Validated patch model.
    Does not: Accept scores, letters, or API keys.
    """

    model_config = ConfigDict(extra="forbid")

    status: str = Field(description="New status; must be in jobhunt.models.STATUSES.")


class LetterPut(BaseModel):
    """Body for PUT /jobs/{source_id}/letter.

    Purpose: Save the human-edited letter back to the store.
    Inputs: Full letter markdown/text.
    Returns: Validated model.
    Does not: Call Gemini or change job status unless the route does.
    """

    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1)
