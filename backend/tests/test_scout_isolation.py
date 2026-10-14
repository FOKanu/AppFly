"""Test scout per-source isolation behavior."""

import httpx
import pytest
from unittest.mock import patch
from pathlib import Path

from jobhunt.config import AppConfig
from jobhunt.features.scout import collect_jobs
from jobhunt.models import Requirements
from jobhunt.policy import CrawlDeniedError
from jobhunt.vault import Vault
from jobhunt.models import Job


def _create_mock_job(url="http://example.com", source="test"):
    """Create a mock job object with required attributes."""
    job = Job(
        title="Test Job",
        company="Test Company",
        url=url,
        location="Test Location",
        source_id="test-123",
        description="Test description",
        source=source
    )
    return job


def test_scout_isolates_agentur_error_and_preserves_inbox_jobs():
    """Test that agentur errors don't prevent inbox jobs from being returned."""
    config = AppConfig(sources={"agentur": True, "inbox": True, "rss": []})
    vault = Vault(root=Path("/tmp"))
    requirements = Requirements(skip_companies=[])

    # Mock fetch functions
    with patch("jobhunt.features.scout.fetch_agentur_jobs") as mock_agentur, \
         patch("jobhunt.features.scout.fetch_inbox_jobs") as mock_inbox:

        mock_agentur.side_effect = httpx.ConnectError("down")
        mock_inbox.return_value = [_create_mock_job(source="inbox")]  # Return a proper job

        errors = []
        jobs = collect_jobs(config, vault, requirements, errors=errors)

        # Should return the inbox job
        assert len(jobs) == 1
        # Should record the agentur error
        assert len(errors) == 1
        assert errors[0].startswith("agentur: ConnectError")


def test_scout_isolates_rss_errors_and_redacts_tokens():
    """Test that RSS errors are isolated and query tokens are redacted."""
    config = AppConfig(sources={"agentur": False, "inbox": False, "rss": [
        "https://feeds.example.com/a?token=SECRET",
        "https://ok.example.org/b"
    ]})
    vault = Vault(root=Path("/tmp"))
    requirements = Requirements(skip_companies=[])

    # Mock fetch functions
    with patch("jobhunt.features.scout.fetch_rss_jobs") as mock_rss:
        # First RSS URL raises an error, second returns a job
        mock_rss.side_effect = [Exception("error"), [_create_mock_job(source="rss")]]

        errors = []
        jobs = collect_jobs(config, vault, requirements, errors=errors)

        # Should return the job from the second RSS URL
        assert len(jobs) == 1
        # Should record the error for the first RSS URL with redacted hostname
        assert len(errors) == 1
        assert "rss feeds.example.com" in errors[0]
        assert "SECRET" not in errors[0]  # Token should be redacted


def test_scout_re_raises_crawl_denied_error():
    """Test that CrawlDeniedError is always re-raised even when errors=[] is provided."""
    config = AppConfig(sources={"agentur": False, "inbox": False, "rss": [
        "https://www.linkedin.com/jobs/feed"
    ]})
    vault = Vault(root=Path("/tmp"))
    requirements = Requirements(skip_companies=[])

    # Mock fetch functions
    with patch("jobhunt.features.scout.fetch_rss_jobs") as mock_rss:
        mock_rss.side_effect = CrawlDeniedError("denied")

        errors = []
        with pytest.raises(CrawlDeniedError):
            collect_jobs(config, vault, requirements, errors=errors)


def test_scout_isolates_errors_in_run_all():
    """Test that run_all records scout errors properly."""
    # This test will be implemented in the pipeline test file
    pass


def test_scout_guard_no_errors_kwarg():
    """Guard: ensure errors kwarg works correctly."""
    config = AppConfig(sources={"agentur": True, "inbox": False, "rss": []})
    vault = Vault(root=Path("/tmp"))
    requirements = Requirements(skip_companies=[])

    # This should work now with the new errors parameter
    errors = []
    jobs = collect_jobs(config, vault, requirements, errors=errors)
    # Just verify it doesn't crash - the parameter is now supported
    assert isinstance(jobs, list)
