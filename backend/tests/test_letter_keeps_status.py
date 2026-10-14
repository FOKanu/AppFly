"""Tests for letter writing status preservation.

This module tests that writing a letter preserves approved/applied/skipped statuses
instead of unconditionally setting status to 'draft'.
"""

from pathlib import Path

from jobhunt.models import Job
from jobhunt.store.sqlite.store import SqliteStore
from jobhunt.vault import Vault


def test_vault_write_letter_keeps_approved_status(tmp_path):
    """Test that Vault.write_letter preserves 'approved' status."""
    vault = Vault(tmp_path)
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
    # Assert letter frontmatter is populated
    assert "letter" in notes[0].metadata
    assert notes[0].metadata["letter"] is not None


def test_sqlite_store_write_letter_keeps_applied_status(tmp_path):
    """Test that SqliteStore.write_letter preserves 'applied' status."""
    store = SqliteStore(tmp_path / "data")
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
    # Assert store.get_letter returns a record
    letter_record = store.get_letter("test-123")
    assert letter_record is not None


def test_sqlite_store_write_letter_keeps_skipped_status(tmp_path):
    """Test that SqliteStore.write_letter preserves 'skipped' status."""
    store = SqliteStore(tmp_path / "data")
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
    # Assert store.get_letter returns a record
    letter_record = store.get_letter("test-123")
    assert letter_record is not None


def _seed_job(api_vault: Path, source_id: str = "ref-1", *, status: str = "inbox") -> Vault:
    vault = Vault(api_vault)
    vault.ensure_dirs()
    vault.upsert_job(
        Job(
            source_id=source_id,
            source="inbox",
            title="Software Engineer",
            company="SAP",
            url="https://example.com/job",
            location="Berlin",
            description="Build Python APIs for internal tools.",
        ),
        status=status,
    )
    return vault


def test_api_regenerate_letter_keeps_approved_status(api_client, api_vault, secret_store, monkeypatch):
    """Test that API /jobs/{source_id}/letter/regenerate preserves 'approved' status."""
    import jobhunt.features.write.letters as letters_mod

    # Seed a job with approved status
    _seed_job(api_vault, "ref-1", status="approved")

    # Save a test API key to secret store
    secret_store.save("gemini", "test-key")

    # Mock the gemini call to return a fixed response
    monkeypatch.setattr(letters_mod, "_call_gemini", lambda config, packet: ("Subject: x\n\nBody", 1, 1))
    # Also need to mock the environment variable to prevent real API calls
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    # Make the API call to regenerate letter
    response = api_client.post("/jobs/ref-1/letter/regenerate")
    assert response.status_code == 200

    # Verify that the job status is still 'approved'
    response = api_client.get("/jobs/ref-1")
    assert response.status_code == 200
    job_data = response.json()
    assert job_data["status"] == "approved"
