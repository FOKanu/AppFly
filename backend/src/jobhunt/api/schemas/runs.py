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
    """One day's run note for GET /runs.

    Purpose: List vault run logs without dumping the whole Runs folder as raw files.
    Inputs: A ``Runs/YYYY-MM-DD.md`` note.
    Returns: Date, path, short preview, and whether errors were recorded.
    Does not: Include API keys or job description full text.
    """

    model_config = ConfigDict(extra="forbid")

    date: str
    path: str
    preview: str
    has_errors: bool = False
