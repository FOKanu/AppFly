"""Pipeline run API and CLI tests."""

from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from jobhunt.cli import app as cli_app
from jobhunt.config import load_config
from jobhunt.features.pipeline.run_all import PipelineResult, run_all
from jobhunt.vault import Vault


def test_post_runs_returns_summary_and_write_error(
    api_client: TestClient, api_vault: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    response = api_client.post("/runs")
    assert response.status_code == 200
    data = response.json()
    assert data["scouted"] == 0
    assert data["shortlisted"] == 0
    assert data["errors"]
    assert any(item.startswith("write:") for item in data["errors"])
    assert "GEMINI_API_KEY" in data["errors"][0]
    vault = Vault(api_vault)
    assert vault.runs_dir.exists()
    notes = list(vault.runs_dir.glob("*.md"))
    assert notes
    listed = api_client.get("/runs")
    assert listed.status_code == 200
    assert listed.json()[0]["has_errors"] is True
    assert "AIza" not in listed.text


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
    monkeypatch.setattr("jobhunt.api.routes.runs.run_all", lambda config: fake)
    response = api_client.post("/runs")
    assert response.status_code == 200
    data = response.json()
    assert data["scouted"] == 2
    assert data["written"] == 1
    assert data["errors"] == []
    assert data["model"] == "gemini-2.5-flash"


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
