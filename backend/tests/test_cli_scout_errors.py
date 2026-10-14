import httpx
import pytest
import yaml
from pathlib import Path
from typer.testing import CliRunner

from jobhunt.cli import app


def test_scout_reports_source_errors_and_exits_1(api_config, monkeypatch):
    # Setup config with agentur source enabled
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw.setdefault("sources", {})
    raw["sources"]["agentur"] = True
    raw["sources"]["inbox"] = True
    raw["sources"]["rss"] = []

    # Write back the modified config
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False))

    # Setup vault path
    vault = Path(raw["vault_path"])

    # Create inbox clip
    inbox_dir = vault / "_inbox"
    inbox_dir.mkdir(parents=True, exist_ok=True)
    clip_content = """---
company: FreshCo
url: https://example.com/new
title: New Role
---
"""
    (inbox_dir / "clip.md").write_text(clip_content)

    # Mock agentur to raise an exception
    def fake_agentur(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr("jobhunt.features.scout.fetch_agentur_jobs", fake_agentur)

    # Mock apify to return empty list
    monkeypatch.setattr("jobhunt.features.scout.fetch_apify_jobs", lambda *a, **k: [])

    # Run scout command
    result = CliRunner().invoke(app, ["scout", "-c", str(api_config)])

    # Check exit code
    assert result.exit_code == 1

    # Combine stdout and stderr for checking
    output = result.stdout + getattr(result, "stderr", "")

    # Check output contains expected messages
    assert "Wrote 1 new job notes" in output
    assert "error: scout: agentur" in output

    # Check that one job file was created
    job_files = list((vault / "Jobs").glob("*.md"))
    assert len(job_files) == 1
