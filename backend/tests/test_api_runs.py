"""Pipeline run API and CLI tests."""

from __future__ import annotations

import time
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from jobhunt.cli import app as cli_app
from jobhunt.config import load_config
from jobhunt.features.pipeline.run_all import PipelineResult, run_all
from jobhunt.vault import Vault


def test_post_runs_accepts_async_and_completes(
    api_client: TestClient, api_vault: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def fake_run_all(config, vault=None, **_kwargs):
        v = Vault(config.vault)
        v.ensure_dirs()
        path = v.append_run_note("2099-01-01", "### Test run\n### Errors\n- write: GEMINI_API_KEY\n")
        return PipelineResult(
            started=datetime.now().astimezone(),
            scouted=0,
            shortlisted=0,
            skipped=0,
            written=0,
            write_skipped=0,
            errors=["write: GEMINI_API_KEY is not set"],
            run_path=path,
            home_path=v.root / "Home.md",
            model=config.gemini_model,
        )

    monkeypatch.setattr("jobhunt.api.runner.run_all", fake_run_all)
    response = api_client.post("/runs")
    assert response.status_code == 200
    body = response.json()
    assert "id" in body
    run_id = body["id"]
    status = None
    for _ in range(50):
        status = api_client.get(f"/runs/{run_id}")
        assert status.status_code == 200
        if status.json()["status"] in {"completed", "completed_with_errors", "failed", "cancelled"}:
            break
        time.sleep(0.05)
    assert status is not None
    data = status.json()
    # B2: errors from a normal return are "completed_with_errors", not "failed".
    assert data["status"] == "completed_with_errors"
    assert data["interrupted"] is False
    assert data["errors"]
    assert "GEMINI_API_KEY" in data["errors"][0]
    listed = api_client.get("/runs")
    assert listed.status_code == 200
    assert isinstance(listed.json(), list)


def test_post_runs_uses_pipeline_result(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    fake = PipelineResult(
        started=datetime.now().astimezone(),
        scouted=2,
        shortlisted=1,
        skipped=0,
        written=1,
        write_skipped=0,
        errors=[],
        run_path=tmp_path / "Runs" / "today.md",
        home_path=tmp_path / "Home.md",
        model="gemini-2.5-flash",
    )
    monkeypatch.setattr("jobhunt.api.runner.run_all", lambda config, vault=None, **_kwargs: fake)
    response = api_client.post("/runs")
    assert response.status_code == 200
    run_id = response.json()["id"]
    status = None
    for _ in range(50):
        status = api_client.get(f"/runs/{run_id}")
        if status.json()["status"] in {"completed", "completed_with_errors", "failed"}:
            break
        time.sleep(0.05)
    assert status is not None
    data = status.json()
    assert data["scouted"] == 2
    assert data["written"] == 1
    assert data["errors"] == []
    assert data["model"] == "gemini-2.5-flash"
    assert data["status"] == "completed"


def test_run_all_continues_after_scout_error(
    api_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")

    def boom(*_args: object, **_kwargs: object) -> list:
        raise RuntimeError("scout failed")

    import jobhunt.features.pipeline.run_all as pipeline

    monkeypatch.setattr(pipeline, "collect_jobs", boom)
    monkeypatch.setattr(
        pipeline,
        "match_jobs",
        lambda *_a, **_k: {"shortlisted": 0, "skipped": 0, "unchanged": 0},
    )
    monkeypatch.setattr(
        pipeline,
        "write_letters",
        lambda *_a, **_k: {"written": 0, "skipped": 0, "capped": 0},
    )
    cfg = load_config(api_config)
    result = run_all(cfg)
    assert result.errors[0].startswith("scout:")
    assert result.run_path.exists()
    assert result.home_path.exists()


def test_cli_run_still_works(api_config: Path, api_vault: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    runner = CliRunner()
    result = runner.invoke(cli_app, ["run", "--config", str(api_config)])
    assert result.exit_code == 1
    assert "Run complete." in result.stdout
    assert "Log:" in result.stdout
    assert "error: write:" in result.stderr or "error: write:" in result.stdout
    vault = Vault(api_vault)
    assert list(vault.runs_dir.glob("*.md"))
