"""Pipeline run routes.

Purpose: Start scout → match → write and list vault run notes.
Inputs: AppConfig from the request; vault ``Runs/*.md`` for GET.
Returns: A run summary with errors, or a list of log previews.
Does not: Reimplement matching/scraping or return API keys.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from jobhunt.api.app import get_config, get_vault
from jobhunt.api.schemas.runs import RunLogSummary, RunResponse
from jobhunt.features.pipeline.run_all import run_all
from jobhunt.vault import Vault

router = APIRouter(tags=["runs"])

_PREVIEW_CHARS = 500


@router.post("/runs", response_model=RunResponse)
def start_run(request: Request) -> RunResponse:
    """Run the same pipeline as ``jobhunt run``.

    Purpose: Let the frontend trigger scout → match → write locally.
    Inputs: Config/vault from app state (no request body).
    Returns: Counts, vault paths, and per-step error strings.
    Does not: Auto-submit applications or crawl deny-listed hosts (policy still applies).
    """

    config = get_config(request)
    result = run_all(config)
    return RunResponse(
        started=result.started.isoformat(timespec="seconds"),
        scouted=result.scouted,
        shortlisted=result.shortlisted,
        skipped=result.skipped,
        written=result.written,
        write_skipped=result.write_skipped,
        errors=result.errors,
        run_path=str(result.run_path),
        home_path=str(result.home_path),
        model=result.model,
    )


@router.get("/runs", response_model=list[RunLogSummary])
def list_runs(request: Request) -> list[RunLogSummary]:
    """List run-log summaries from the vault.

    Purpose: Show recent pipeline history in the UI.
    Inputs: ``Runs/*.md`` notes written by the pipeline.
    Returns: Newest-first summaries with a short preview.
    Does not: Return API keys or full job descriptions.
    """

    vault = get_vault(request)
    return _run_summaries(vault)


def _run_summaries(vault: Vault) -> list[RunLogSummary]:
    """Parse ``Runs/`` into API summaries.

    Purpose: Turn daily markdown logs into list rows.
    Inputs: Vault whose ``runs_dir`` may be missing.
    Returns: Summaries sorted by filename descending.
    Does not: Execute the pipeline.
    """

    if not vault.runs_dir.exists():
        return []
    rows: list[RunLogSummary] = []
    for path in sorted(vault.runs_dir.glob("*.md"), reverse=True):
        if path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8")
        body = text.strip()
        rows.append(
            RunLogSummary(
                date=path.stem,
                path=str(path),
                preview=body[:_PREVIEW_CHARS],
                has_errors="### Errors" in text,
            )
        )
    return rows
