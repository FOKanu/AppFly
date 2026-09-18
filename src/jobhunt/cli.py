"""Typer CLI: init, scout, match, write, and run (pipeline).

Purpose: Keep command-line behavior while run orchestration lives in
``jobhunt.features.pipeline.run_all``.
Inputs: Optional ``--config`` path; commands load ``AppConfig``.
Returns: Prints status lines; ``run`` exits 1 when the pipeline recorded errors.
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
from jobhunt.vault import Vault, init_workspace

app = typer.Typer(help="Job hunt copilot: scout, match, write letters into Obsidian.")


def _config(config_path: Optional[Path]) -> AppConfig:
    return load_config(config_path)


@app.command()
def init(
    config: Optional[Path] = typer.Option(None, "--config", "-c", help="Config YAML path"),
    vault_path: Optional[Path] = typer.Option(None, "--vault", help="Override vault directory"),
) -> None:
    """Create config.yaml and a dedicated Obsidian vault from templates."""
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
    """Fetch new jobs from Agentur, RSS, and the vault inbox."""
    from jobhunt.policy import CrawlDeniedError
    from jobhunt.scout import collect_jobs

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
    """Apply hard filters and score inbox jobs locally."""
    from jobhunt.match import match_jobs

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
    """Write cover letters for shortlisted jobs via Gemini."""
    from jobhunt.write import write_letters

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
    """Scout, match, write, refresh Home.md, and append today's run note."""
    from jobhunt.features.pipeline.run_all import run_all as run_pipeline

    cfg = _config(config)
    result = run_pipeline(cfg)
    typer.echo(f"Run complete. Home: {result.home_path}")
    typer.echo(f"Log: {result.run_path}")
    if result.errors:
        for item in result.errors:
            typer.echo(f"error: {item}", err=True)
        raise typer.Exit(code=1)


@app.callback()
def _root() -> None:
    """Job hunt copilot."""


def main() -> None:
    app()


if __name__ == "__main__":
    main()
