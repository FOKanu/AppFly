"""Tests for letter writing status preservation.

This module tests that writing a letter preserves approved/applied/skipped statuses
instead of unconditionally setting status to 'draft'.
"""

import tempfile
from pathlib import Path

from jobhunt.models import Job
from jobhunt.store.sqlite.store import SqliteStore
from jobhunt.vault import Vault


def test_vault_write_letter_keeps_approved_status():
    """Test that Vault.write_letter preserves 'approved' status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        vault = Vault(Path(tmpdir))
        vault.ensure_dirs()

        # Create a job with approved status
        job = Job(
            source_id="test-123",
            source="test-source",
            title="Test Job",
            company="Test Company",
            url="https://example.com",
            location="Test Location",
            description="Test description",
        )

        # First upsert the job with approved status
        vault.upsert_job(job, status="approved")

        # Write a letter - this should preserve the approved status
        vault.write_letter(
            job=job,
            body="Test letter content",
            model="test-model",
            tokens_in=10,
            tokens_out=20
        )

        # Check that the job status is still 'approved'
        notes = vault.iter_job_notes()
        assert len(notes) == 1
        assert notes[0].metadata["status"] == "approved"


def test_sqlite_store_write_letter_keeps_applied_status():
    """Test that SqliteStore.write_letter preserves 'applied' status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = SqliteStore(Path(tmpdir) / "data")
        store.ensure_dirs()

        # Create a job and set it to applied status
        job = Job(
            source_id="test-123",
            source="test-source",
            title="Test Job",
            company="Test Company",
            url="https://example.com",
            location="Test Location",
            description="Test description",
        )

        # Upsert the job first
        store.upsert_job(job)

        # Update to applied status
        store.update_job_meta("test-123", status="applied")

        # Write a letter - this should preserve the applied status
        store.write_letter(
            job=job,
            body="Test letter content",
            model="test-model",
            tokens_in=10,
            tokens_out=20
        )

        # Check that the job status is still 'applied'
        notes = store.iter_job_notes()
        assert len(notes) == 1
        assert notes[0].metadata["status"] == "applied"


def test_sqlite_store_write_letter_keeps_skipped_status():
    """Test that SqliteStore.write_letter preserves 'skipped' status."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = SqliteStore(Path(tmpdir) / "data")
        store.ensure_dirs()

        # Create a job and set it to skipped status
        job = Job(
            source_id="test-123",
            source="test-source",
            title="Test Job",
            company="Test Company",
            url="https://example.com",
            location="Test Location",
            description="Test description",
        )

        # Upsert the job first
        store.upsert_job(job)

        # Update to skipped status
        store.update_job_meta("test-123", status="skipped")

        # Write a letter - this should preserve the skipped status
        store.write_letter(
            job=job,
            body="Test letter content",
            model="test-model",
            tokens_in=10,
            tokens_out=20
        )

        # Check that the job status is still 'skipped'
        notes = store.iter_job_notes()
        assert len(notes) == 1
        assert notes[0].metadata["status"] == "skipped"


def test_sqlite_store_write_letter_promotes_inbox_shortlist_to_draft():
    """Test that SqliteStore.write_letter promotes inbox/shortlist to draft."""
    with tempfile.TemporaryDirectory() as tmpdir:
        store = SqliteStore(Path(tmpdir) / "data")
        store.ensure_dirs()

        # Create a job and set it to inbox status
        job = Job(
            source_id="test-123",
            source="test-source",
            title="Test Job",
            company="Test Company",
            url="https://example.com",
            location="Test Location",
            description="Test description",
        )

        # Upsert the job with inbox status
        store.upsert_job(job, status="inbox")

        # Write a letter - this should promote inbox to draft
        store.write_letter(
            job=job,
            body="Test letter content",
            model="test-model",
            tokens_in=10,
            tokens_out=20
        )

        # Check that the job status is now 'draft'
        notes = store.iter_job_notes()
        assert len(notes) == 1
        assert notes[0].metadata["status"] == "draft"
