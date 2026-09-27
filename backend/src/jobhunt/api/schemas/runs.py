"""Pipeline run DTOs.

Purpose: Summaries for POST /runs and GET /runs.
Inputs: ``PipelineResult`` or vault ``Runs/*.md`` notes.
Returns: Counts, error strings, and a short log preview.
Does not: Include API keys, CV text, or full letter bodies.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class RunResponse(BaseModel):
    """Result of POST /runs (one scout → match → write pass).

    Purpose: Tell the UI what the pipeline did, including step errors.
    Inputs: ``PipelineResult`` from ``jobhunt.features.pipeline.run_all``.
    Returns: Counts, ISO start time, vault paths, and error strings.
    Does not: Echo connector secrets or the Gemini prompt packet.
    """

    model_config = ConfigDict(extra="forbid")

    started: str
    scouted: int
    shortlisted: int
    skipped: int
    written: int
    write_skipped: int
    errors: list[str] = Field(default_factory=list)
    run_path: str
    home_path: str
    model: str = ""


class RunLogSummary(BaseModel):
    """One row of GET /runs: a pipeline run or a legacy day note.

    Purpose: Activity list with one row per run id (live state wins over stored state).
    Inputs: In-memory runner records, the store ``runs`` table, ``Runs/YYYY-MM-DD.md`` notes.
    Returns: Legacy ``date``/``path``/``preview``/``has_errors`` plus id, kind, status,
    timestamps, ``counts`` (scouted/matched/written where known) and ``error_count`` and ``interrupted`` (B3: settled as stale)
    and ``stage`` (B1: current stage while running).
    Does not: Include API keys or job description full text.
    """

    model_config = ConfigDict(extra="forbid")

    date: str
    path: str
    preview: str
    has_errors: bool = False
    id: str = ""
    kind: str = "run"
    status: str = ""
    started_at: str = ""
    finished_at: str = ""
    counts: dict[str, int] = Field(default_factory=dict)
    error_count: int = 0
    interrupted: bool = False
    stage: str | None = None
