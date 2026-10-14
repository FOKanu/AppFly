"""Test scout per-source isolation behavior."""

import httpx
import pytest

from jobhunt.config import AppConfig
from jobhunt.features.scout import collect_jobs
from jobhunt.models import Job, Requirements
from jobhunt.policy import CrawlDeniedError
from jobhunt.vault import Vault


def test_agentur_error_isolated_inbox_kept(tmp_path, monkeypatch):
    """Test that agentur errors don't prevent inbox jobs from being returned."""
    vault = Vault(root=tmp_path)
    vault.ensure_dirs()

    # Create an inbox clip
    inbox_dir = tmp_path / "_inbox"
    inbox_dir.mkdir(exist_ok=True)
    clip_file = inbox_dir / "clip.md"
    clip_file.write_text("""---
company: FreshCo
url: https://example.com/new
---

# New Role
""")

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = True
    cfg.sources.inbox = True
    cfg.sources.rss = []

    # Mock fetch functions
    def fake_agentur(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr("jobhunt.features.scout.fetch_agentur_jobs", fake_agentur)

    errors = []
    jobs = collect_jobs(cfg, vault, Requirements(), errors=errors)

    # Should return the inbox job
    assert len(jobs) == 1
    # Should record the agentur error
    assert len(errors) == 1
    assert errors[0].startswith("agentur: ConnectError")


def test_rss_error_label_has_host_not_token(tmp_path, monkeypatch):
    """Test that RSS errors are isolated and query tokens are redacted."""
    vault = Vault(root=tmp_path)
    vault.ensure_dirs()

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = False
    cfg.sources.inbox = False
    cfg.sources.rss = [
        "https://feeds.example.com/a?token=SECRET",
        "https://ok.example.org/b"
    ]

    # Mock fetch functions
    def fake_rss(url, *a, **k):
        if "feeds.example.com" in url:
            raise Exception(url)  # Include the URL (with token) in the exception for testing
        return [Job(source_id="rss-1", source="rss", title="T", company="C", url=url)]

    monkeypatch.setattr("jobhunt.features.scout.fetch_rss_jobs", fake_rss)

    errors = []
    jobs = collect_jobs(cfg, vault, Requirements(), errors=errors)

    # Should return the job from the second RSS URL
    assert len(jobs) == 1
    # Should record the error for the first RSS URL with redacted hostname
    assert len(errors) == 1
    assert errors[0].startswith("rss feeds.example.com:")
    # The token should be redacted from the label, but might appear in the exception message


def test_crawl_denied_is_not_isolated(tmp_path):
    """Test that CrawlDeniedError is always re-raised even when errors=[] is provided."""
    vault = Vault(root=tmp_path)
    vault.ensure_dirs()

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = False
    cfg.sources.inbox = False
    cfg.sources.rss = [
        "https://www.linkedin.com/jobs/feed"
    ]

    errors = []
    with pytest.raises(CrawlDeniedError):
        collect_jobs(cfg, vault, Requirements(), errors=errors)


def test_run_all_records_scout_error(tmp_path, monkeypatch):
    """Test that run_all records scout errors properly."""
    vault = Vault(root=tmp_path)
    vault.ensure_dirs()

    # Create an inbox clip
    inbox_dir = tmp_path / "_inbox"
    inbox_dir.mkdir(exist_ok=True)
    clip_file = inbox_dir / "clip.md"
    clip_file.write_text("""---
company: FreshCo
url: https://example.com/new
---

# New Role
""")

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = True
    cfg.sources.inbox = True
    cfg.sources.rss = []

    # Mock fetch functions
    def fake_agentur(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr("jobhunt.features.scout.fetch_agentur_jobs", fake_agentur)

    # Delete the environment variable to trigger the error in run_all
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)  # keep the writer offline

    import jobhunt.features.pipeline.run_all as pipeline
    monkeypatch.setattr(pipeline, "match_jobs", lambda *_a, **_k: {"shortlisted": 0, "skipped": 0, "unchanged": 0})
    monkeypatch.setattr(pipeline, "write_letters", lambda *_a, **_k: {"written": 0, "skipped": 0, "capped": 0})

    # Set cache_dir if it exists
    try:
        cfg.cache_dir = tmp_path / "cache"
    except AttributeError:
        pass

    from jobhunt.features.pipeline.run_all import run_all

    result = run_all(cfg, vault)

    # Should have scouted 1 job (from inbox)
    assert result.scouted == 1
    # Should record the scout error
    assert any(e.startswith("scout: agentur:") for e in result.errors)


def test_guard_without_errors_kwarg_reraises(tmp_path, monkeypatch):
    """Guard: ensure errors kwarg works correctly."""
    vault = Vault(root=tmp_path)
    vault.ensure_dirs()

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = True
    cfg.sources.inbox = False
    cfg.sources.rss = []

    # Mock fetch functions
    def fake_agentur(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr("jobhunt.features.scout.fetch_agentur_jobs", fake_agentur)

    # This should raise the exception since errors kwarg is not provided
    with pytest.raises(httpx.ConnectError):
        collect_jobs(cfg, vault, Requirements())
