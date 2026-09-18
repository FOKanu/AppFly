"""Jobhunt Copilot command-line entry point.

Purpose: Expose ``init``, ``scout``, ``match``, ``write``, and ``run``.
Inputs: Optional ``--config`` / ``--vault`` paths from the user.
Returns: Typer ``app`` invoked as the ``jobhunt`` console script.
Does not: Crawl deny-listed hosts or submit applications.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

import typer
import yaml

from jobhunt.config import (
    DEFAULT_CONFIG_PATH,
    AppConfig,
    load_config,
    write_example_config,
)
from jobhunt.runlog import format_run_note
from jobhunt.vault import Vault, init_workspace

app = typer.Typer(help="Job hunt copilot: scout, match, write letters into Obsidian.")


def _config(config_path: Optional[Path]) -> AppConfig:
    """Load YAML config (and .env) from the given path or the repo default."""

    return load_config(config_path)


@app.command()
def init(
    config: Optional[Path] = typer.Option(None, "--config", "-c", help="Config YAML path"),
    vault_path: Optional[Path] = typer.Option(None, "--vault", help="Override vault directory"),
) -> None:
    """Create config.yaml and a dedicated Obsidian vault from templates.

    Purpose: First-run workspace setup.
    Inputs: Optional config path and vault directory override.
    Returns: None; writes config, optional ``.env``, and vault files.
    Does not: Fetch jobs or call Gemini.
    """

    dest = config or DEFAULT_CONFIG_PATH
    if not dest.exists():
        write_example_config(dest)
        typer.echo(f"Wrote {dest}")
    else:
        typer.echo(f"Keeping existing {dest}")

    env_example = dest.parent / ".env.example"
    env_path = dest.parent / ".env"
    if env_example.exists() and not env_path.exists():
        env_path.write_text(env_example.read_text(encoding="utf-8"), encoding="utf-8")
        typer.echo(f"Wrote {env_path} (add GEMINI_API_KEY)")

    if vault_path:
        raw = yaml.safe_load(dest.read_text(encoding="utf-8")) or {}
        raw["vault_path"] = str(vault_path.expanduser())
        dest.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
        typer.echo(f"Set vault_path to {vault_path}")

    cfg = load_config(dest)
    vault = init_workspace(cfg)
    vault.regenerate_home(last_run="init")
    typer.echo(f"Vault ready at {vault.root}")
    typer.echo("Open that folder in Obsidian, then fill CV/Master.md and Requirements.md.")


@app.command()
def scout(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Fetch new jobs from Agentur, RSS, and the vault inbox.

    Purpose: Ingest listings into ``Jobs/`` notes.
    Inputs: Optional config path.
    Returns: None; upserts new jobs and refreshes Home.md.
    Does not: HTTP-fetch deny-listed listing URLs.
    """

    from jobhunt.policy import CrawlDeniedError
    from jobhunt.features.scout import collect_jobs

    cfg = _config(config)
    vault = Vault(cfg.vault)
    vault.ensure_dirs()
    requirements = vault.load_requirements()
    try:
        jobs = collect_jobs(cfg, vault, requirements)
    except CrawlDeniedError as exc:
        typer.echo(str(exc), err=True)
        raise typer.Exit(code=1) from exc
    for job in jobs:
        vault.upsert_job(job)
    vault.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
    typer.echo(f"Wrote {len(jobs)} new job notes")


@app.command()
def match(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Apply hard filters and score inbox jobs locally.

    Purpose: Promote inbox notes to shortlist or skipped.
    Inputs: Optional config path.
    Returns: None; updates job frontmatter and Home.md.
    Does not: Fetch new listings or call Gemini.
    """

    from jobhunt.features.match import match_jobs

    cfg = _config(config)
    vault = Vault(cfg.vault)
    stats = match_jobs(cfg, vault)
    vault.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
    typer.echo(
        f"Shortlisted {stats['shortlisted']}, skipped {stats['skipped']}, left {stats['unchanged']}"
    )


@app.command()
def write(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Write cover letters for shortlisted jobs via Gemini.

    Purpose: Draft letters from a sealed one-job packet.
    Inputs: Optional config path (Gemini key from ``.env``).
    Returns: None; writes Letters/ notes and sets status to draft.
    Does not: Submit applications or include a second job in the packet.
    """

    from jobhunt.features.write import write_letters

    cfg = _config(config)
    vault = Vault(cfg.vault)
    stats = write_letters(cfg, vault)
    vault.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
    typer.echo(
        f"Wrote {stats['written']} letters "
        f"(skipped {stats['skipped']}, over cap {stats['capped']})"
    )


@app.command("run")
def run_all(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Scout, match, write, refresh Home.md, and append today's run note.

    Purpose: One nightly pipeline with a run log.
    Inputs: Optional config path.
    Returns: None; continues past stage errors and exits 1 if any occurred.
    Does not: Submit applications or crawl deny-listed hosts.
    """

    from jobhunt.features.match import match_jobs
    from jobhunt.features.scout import collect_jobs
    from jobhunt.features.write import write_letters

    cfg = _config(config)
    vault = Vault(cfg.vault)
    vault.ensure_dirs()
    started = datetime.now().astimezone()
    errors: list[str] = []
    scouted = 0
    shortlisted = 0
    skipped = 0
    written = 0
    write_skipped = 0

    try:
        requirements = vault.load_requirements()
        jobs = collect_jobs(cfg, vault, requirements)
        for job in jobs:
            vault.upsert_job(job)
        scouted = len(jobs)
    except Exception as exc:  # noqa: BLE001 — run should continue
        errors.append(f"scout: {exc}")

    try:
        stats = match_jobs(cfg, vault)
        shortlisted = stats["shortlisted"]
        skipped = stats["skipped"]
    except Exception as exc:  # noqa: BLE001
        errors.append(f"match: {exc}")

    try:
        write_stats = write_letters(cfg, vault)
        written = write_stats["written"]
        write_skipped = write_stats["skipped"]
    except Exception as exc:  # noqa: BLE001
        errors.append(f"write: {exc}")

    stamp = started.isoformat(timespec="minutes")
    vault.regenerate_home(last_run=stamp)
    note = format_run_note(
        started=started,
        scouted=scouted,
        shortlisted=shortlisted,
        skipped=skipped,
        written=written,
        write_skipped=write_skipped,
        model=cfg.gemini_model,
        errors=errors,
    )
    run_path = vault.append_run_note(started.date().isoformat(), note)
    typer.echo(f"Run complete. Home: {vault.root / 'Home.md'}")
    typer.echo(f"Log: {run_path}")
    if errors:
        for item in errors:
            typer.echo(f"error: {item}", err=True)
        raise typer.Exit(code=1)


@app.callback()
def _root() -> None:
    """Job hunt copilot."""


def main() -> None:
    """Purpose: Console-script hook. Inputs: process argv. Returns: None. Does not: Change pipeline order."""

    app()


if __name__ == "__main__":
    main()
