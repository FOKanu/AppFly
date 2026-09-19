"""Run scout, match, and write as one local pipeline.

Purpose: Share the CLI ``jobhunt run`` sequence with the HTTP API.
Inputs: ``AppConfig`` and an optional ``Vault``.
Returns: ``PipelineResult`` with counts, errors, and vault paths.
Does not: Reimplement matching/scraping, crawl deny-listed hosts, or submit applications.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from jobhunt.config import AppConfig
from jobhunt.features.match import match_jobs
from jobhunt.features.scout import collect_jobs
from jobhunt.features.write import write_letters
from jobhunt.runlog import format_run_note
from jobhunt.store import get_store
from jobhunt.vault import Vault


@dataclass
class PipelineResult:
    """Counts and paths from one scout → match → write pass.

    Purpose: Give the CLI and API the same summary shape.
    Inputs: Filled by ``run_all``.
    Returns: Dataclass fields only; no API keys.
    Does not: Include CV text, letters, or connector secrets.
    """

    started: datetime
    scouted: int = 0
    shortlisted: int = 0
    skipped: int = 0
    written: int = 0
    write_skipped: int = 0
    errors: list[str] = field(default_factory=list)
    run_path: Path = Path()
    home_path: Path = Path()
    model: str = ""


def run_all(config: AppConfig, vault: Vault | None = None) -> PipelineResult:
    """Scout, match, write, refresh Home.md, and append today's run note.

    Purpose: One local pass over the store, identical to ``jobhunt run``.
    Inputs: Loaded ``AppConfig``; optional legacy ``Vault`` (markdown only).
    Returns: ``PipelineResult`` with step counts, error strings, and note paths.
    Does not: Crawl deny-listed job boards, unseal other jobs' packets, or auto-submit.
    """

    store = vault if vault is not None else get_store(config)
    store.ensure_dirs()
    started = datetime.now().astimezone()
    errors: list[str] = []
    scouted = 0
    shortlisted = 0
    skipped = 0
    written = 0
    write_skipped = 0

    try:
        requirements = store.load_requirements()
        jobs = collect_jobs(config, store, requirements)
        for job in jobs:
            store.upsert_job(job)
        scouted = len(jobs)
    except Exception as exc:  # noqa: BLE001 — run should continue
        errors.append(f"scout: {exc}")

    try:
        stats = match_jobs(config, store)
        shortlisted = stats["shortlisted"]
        skipped = stats["skipped"]
    except Exception as exc:  # noqa: BLE001
        errors.append(f"match: {exc}")

    try:
        write_stats = write_letters(config, store)
        written = write_stats["written"]
        write_skipped = write_stats["skipped"]
    except Exception as exc:  # noqa: BLE001
        errors.append(f"write: {exc}")

    stamp = started.isoformat(timespec="minutes")
    home_path = store.regenerate_home(last_run=stamp)
    note = format_run_note(
        started=started,
        scouted=scouted,
        shortlisted=shortlisted,
        skipped=skipped,
        written=written,
        write_skipped=write_skipped,
        model=config.gemini_model,
        errors=errors,
    )
    run_path = store.append_run_note(started.date().isoformat(), note)
    return PipelineResult(
        started=started,
        scouted=scouted,
        shortlisted=shortlisted,
        skipped=skipped,
        written=written,
        write_skipped=write_skipped,
        errors=errors,
        run_path=run_path,
        home_path=home_path,
        model=config.gemini_model,
    )
