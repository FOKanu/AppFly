"""Jobhunt Copilot command-line entry point.

Purpose: Expose ``init``, ``scout``, ``match``, ``write``, and ``run``.
Inputs: Optional ``--config`` / ``--vault`` paths from the user.
Returns: Typer ``app`` invoked as the ``jobhunt`` console script.
Does not: Crawl deny-listed hosts or submit applications.
"""

from __future__ import annotations

import os
import socket
import threading
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Literal, Optional

import typer
import yaml

from jobhunt.config import (
    DEFAULT_CONFIG_PATH,
    AppConfig,
    load_config,
    write_example_config,
)
from jobhunt.store import get_store
from jobhunt.store.types import RunRecord, utc_now
from jobhunt.vault import init_workspace

app = typer.Typer(help="Job hunt copilot: scout, match, write letters into the configured store.")

EXIT_BUSY = 75
Trigger = Literal["cli", "nightly"]


def _config(config_path: Optional[Path]) -> AppConfig:
    """Load YAML config (and .env) from the given path or the repo default."""

    return load_config(config_path)


def _owner() -> str:
    return f"{socket.gethostname()}:{os.getpid()}"


@contextmanager
def _open_store(cfg: AppConfig) -> Iterator[Any]:
    """Open the configured workspace store for one CLI command.

    Purpose: Same store selection as ``jobhunt run`` and ``POST /runs`` (``get_store``).
    Inputs: Loaded ``AppConfig`` (``storage_backend`` native or markdown).
    Returns: The open store; it is closed when the ``with`` block exits.
    Does not: Migrate data between backends or import Obsidian notes.
    """

    store = get_store(cfg)
    try:
        yield store
    finally:
        close = getattr(store, "close", None)
        if callable(close):
            close()


def _claim_or_exit(store: Any, *, trigger: str, stage: str | None, model: str, write_cap: int | None) -> RunRecord:
    """Claim the cross-process run lock or exit 75.

    Purpose: B4 — one active run across API and CLI on the native store.
    Inputs: Open SqliteStore-like object; trigger; optional stage for stage commands.
    Returns: Queued ``RunRecord`` already upserted.
    Does not: Run the pipeline.
    """

    settle = getattr(store, "settle_stale_active_runs", None)
    if callable(settle):
        settle()
    find_active = getattr(store, "find_active_run", None)
    if callable(find_active):
        active = find_active()
        if active is not None:
            typer.echo(
                f"A pipeline run is already active: {active.id} (trigger={active.trigger or 'unknown'}). "
                f"Exit {EXIT_BUSY}.",
                err=True,
            )
            raise typer.Exit(code=EXIT_BUSY)

    record = RunRecord(
        id=uuid.uuid4().hex[:12],
        status="queued",
        started=utc_now(),
        model=model,
        write_cap=write_cap,
        trigger=trigger,
        owner=_owner(),
        heartbeat=utc_now(),
        stage=stage,
    )
    upsert = getattr(store, "upsert_run_status", None)
    if callable(upsert):
        upsert(record)
    return record


def _heartbeat_loop(store: Any, run_id: str, stop: threading.Event) -> None:
    touch = getattr(store, "touch_run_heartbeat", None)
    while not stop.wait(timeout=10.0):
        if callable(touch):
            try:
                touch(run_id)
            except (OSError, RuntimeError):
                pass


def _persist(store: Any, record: RunRecord, **changes: Any) -> RunRecord:
    for key, value in changes.items():
        setattr(record, key, value)
    upsert = getattr(store, "upsert_run_status", None)
    if callable(upsert):
        upsert(record)
    return record


def _run_with_lock(
    cfg: AppConfig,
    store: Any,
    *,
    trigger: str,
    stage: str | None,
    body: Any,
) -> None:
    """Run ``body(cancel, on_progress)`` under a native run record, or plain on markdown."""

    if cfg.storage_backend != "native" or not callable(getattr(store, "find_active_run", None)):
        body(None, None)
        return

    record = _claim_or_exit(
        store,
        trigger=trigger,
        stage=stage,
        model=cfg.gemini_model,
        write_cap=cfg.letter_cap,
    )
    cancel = threading.Event()
    stop_hb = threading.Event()
    hb = threading.Thread(target=_heartbeat_loop, args=(store, record.id, stop_hb), daemon=True)
    _persist(store, record, status="running", heartbeat=utc_now())
    hb.start()

    def on_progress(**changes: Any) -> None:
        check = getattr(store, "is_run_cancel_requested", None)
        if callable(check) and check(record.id):
            cancel.set()
        allowed = {
            k: v
            for k, v in changes.items()
            if k in {"stage", "scouted", "shortlisted", "skipped", "written", "write_skipped"}
        }
        if allowed:
            _persist(store, record, heartbeat=utc_now(), **allowed)

    try:
        result = body(cancel, on_progress)
    except Exception as exc:
        _persist(
            store,
            record,
            status="failed",
            finished=utc_now(),
            stage=None,
            errors=[f"{type(exc).__name__}: {exc}"],
        )
        raise
    finally:
        stop_hb.set()
        hb.join(timeout=1.0)

    if result is None:
        return

    if getattr(result, "cancelled", False):
        status = "cancelled"
    elif getattr(result, "errors", None):
        status = "completed_with_errors"
    else:
        status = "completed"
    _persist(
        store,
        record,
        status=status,
        finished=utc_now(),
        stage=None,
        scouted=getattr(result, "scouted", record.scouted),
        shortlisted=getattr(result, "shortlisted", record.shortlisted),
        skipped=getattr(result, "skipped", record.skipped),
        written=getattr(result, "written", record.written),
        write_skipped=getattr(result, "write_skipped", record.write_skipped),
        errors=list(getattr(result, "errors", []) or []),
        model=getattr(result, "model", record.model) or record.model,
        preview=(
            f"scouted={getattr(result, 'scouted', 0)} "
            f"shortlisted={getattr(result, 'shortlisted', 0)} "
            f"written={getattr(result, 'written', 0)}"
        ),
        heartbeat=utc_now(),
    )


@app.command()
def init(
    config: Optional[Path] = typer.Option(None, "--config", "-c", help="Config YAML path"),
    vault_path: Optional[Path] = typer.Option(None, "--vault", help="Override markdown vault directory"),
    native: bool = typer.Option(False, "--native", help="Initialize SQLite native store (default backend)"),
    markdown: bool = typer.Option(False, "--markdown", help="Initialize Obsidian markdown vault"),
) -> None:
    """Create config.yaml and a native store or Obsidian vault.

    Purpose: First-run workspace setup.
    Inputs: Optional config path; ``--native`` (default) or ``--markdown``.
    Returns: None; writes config and workspace files.
    Does not: Fetch jobs or call Gemini.
    """

    from jobhunt.store import init_native_workspace

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

    raw = yaml.safe_load(dest.read_text(encoding="utf-8")) or {}
    if markdown:
        raw["storage_backend"] = "markdown"
    else:
        raw["storage_backend"] = "native"
        native = True
    if vault_path:
        raw["vault_path"] = str(vault_path.expanduser())
        typer.echo(f"Set vault_path to {vault_path}")
    dest.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")

    cfg = load_config(dest)
    if native or cfg.storage_backend == "native":
        store = init_native_workspace(cfg)
        typer.echo(f"Native store ready at {store.data_path()}")
        typer.echo("Open the Vault page in the UI to upload your CV.")
    else:
        vault = init_workspace(cfg)
        vault.regenerate_home(last_run="init")
        typer.echo(f"Markdown vault ready at {vault.root}")
        typer.echo("Open that folder in Obsidian, then fill CV/Master.md and Requirements.md.")


@app.command()
def scout(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Fetch new jobs from Agentur, RSS, and the vault inbox.

    Purpose: Ingest listings into the configured store.
    Inputs: Optional config path.
    Returns: None; upserts new jobs and refreshes Home.md.
    Does not: HTTP-fetch deny-listed listing URLs.
    """

    from jobhunt.features.scout import collect_jobs
    from jobhunt.policy import CrawlDeniedError

    cfg = _config(config)
    scout_errors: list[str] = []

    def body(cancel: threading.Event | None, on_progress: Any) -> Any:
        if on_progress is not None:
            on_progress(stage="scout")
        store.ensure_dirs()
        requirements = store.load_requirements()
        try:
            jobs = collect_jobs(cfg, store, requirements, errors=scout_errors)
        except CrawlDeniedError as exc:
            typer.echo(str(exc), err=True)
            raise typer.Exit(code=1) from exc
        for job in jobs:
            store.upsert_job(job)
        store.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
        if on_progress is not None:
            on_progress(scouted=len(jobs))
        typer.echo(f"Wrote {len(jobs)} new job notes")
        for err in scout_errors:
            typer.echo(f"error: scout: {err}", err=True)
        return type("R", (), {"scouted": len(jobs), "errors": [f"scout: {e}" for e in scout_errors], "cancelled": False})()

    with _open_store(cfg) as store:
        _run_with_lock(cfg, store, trigger="cli", stage="scout", body=body)
    if scout_errors:
        raise typer.Exit(code=1)


@app.command()
def match(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Apply hard filters and score inbox jobs locally.

    Purpose: Promote inbox notes to shortlist or skipped.
    Inputs: Optional config path.
    Returns: None; updates job status and score in the store and refreshes Home.
    Does not: Fetch new listings or call Gemini.
    """

    from jobhunt.features.match import match_jobs

    cfg = _config(config)

    def body(cancel: threading.Event | None, on_progress: Any) -> Any:
        if on_progress is not None:
            on_progress(stage="match")
        stats = match_jobs(cfg, store)
        store.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
        if on_progress is not None:
            on_progress(shortlisted=stats["shortlisted"], skipped=stats["skipped"])
        typer.echo(
            f"Shortlisted {stats['shortlisted']}, skipped {stats['skipped']}, left {stats['unchanged']}"
        )
        return type(
            "R",
            (),
            {
                "shortlisted": stats["shortlisted"],
                "skipped": stats["skipped"],
                "errors": [],
                "cancelled": False,
            },
        )()

    with _open_store(cfg) as store:
        _run_with_lock(cfg, store, trigger="cli", stage="match", body=body)


@app.command()
def write(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
) -> None:
    """Write cover letters for shortlisted jobs via Gemini.

    Purpose: Draft letters from a sealed one-job packet.
    Inputs: Optional config path (Gemini key from the OS keychain, then ``GEMINI_API_KEY`` in the env or ``.env``).
    Returns: None; writes letters to the store and sets status to draft.
    Does not: Submit applications or include a second job in the packet.
    """

    from jobhunt.features.write import write_letters

    cfg = _config(config)

    def body(cancel: threading.Event | None, on_progress: Any) -> Any:
        if on_progress is not None:
            on_progress(stage="write")
        stats = write_letters(cfg, store)
        store.regenerate_home(last_run=datetime.now().astimezone().isoformat(timespec="minutes"))
        if on_progress is not None:
            on_progress(written=stats["written"], write_skipped=stats["skipped"])
        typer.echo(
            f"Wrote {stats['written']} letters "
            f"(skipped {stats['skipped']}, over cap {stats['capped']})"
        )
        return type(
            "R",
            (),
            {
                "written": stats["written"],
                "write_skipped": stats["skipped"],
                "errors": [],
                "cancelled": False,
            },
        )()

    with _open_store(cfg) as store:
        _run_with_lock(cfg, store, trigger="cli", stage="write", body=body)


@app.command("run")
def run_all(
    config: Optional[Path] = typer.Option(None, "--config", "-c"),
    trigger: str = typer.Option("cli", "--trigger", help="Run trigger: cli or nightly"),
) -> None:
    """Scout, match, write, refresh Home.md, and append today's run note.

    Purpose: One nightly/CLI pipeline with a durable run record on the native store.
    Inputs: Optional config path; ``--trigger cli|nightly`` (default ``cli``).
    Returns: None; continues past stage errors and exits 1 if any occurred; exits 75 if busy.
    Does not: Submit applications or crawl deny-listed hosts.
    """

    from jobhunt.features.pipeline.run_all import run_all as run_pipeline

    if trigger not in ("cli", "nightly"):
        typer.echo("--trigger must be cli or nightly", err=True)
        raise typer.Exit(code=2)

    cfg = _config(config)
    result_holder: dict[str, Any] = {}

    def body(cancel: threading.Event | None, on_progress: Any) -> Any:
        result_holder["r"] = run_pipeline(cfg, store, cancel=cancel, on_progress=on_progress)
        return result_holder["r"]

    with _open_store(cfg) as store:
        _run_with_lock(cfg, store, trigger=trigger, stage=None, body=body)
        result = result_holder["r"]

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
    """Purpose: Console-script hook. Inputs: process argv. Returns: None. Does not: Change pipeline order."""

    app()


if __name__ == "__main__":
    main()
