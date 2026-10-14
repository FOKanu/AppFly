import pytest
from pathlib import Path
from urllib.parse import quote

from jobhunt.vault import Vault
from jobhunt.models import Job
from jobhunt.features.secrets.names import SecretName


def _seed_job(api_vault: Path, source_id: str, *, status: str = "shortlist") -> Vault:
    vault = Vault(api_vault)
    vault.ensure_dirs()
    vault.upsert_job(
        Job(
            source_id=source_id,
            source="rss",
            title="Software Engineer",
            company="SAP",
            url="https://example.com/job",
            location="Berlin",
            description="Build Python APIs for internal tools.",
        ),
        status=status,
    )
    return vault


def _seed_letter(vault: Vault, source_id: str) -> None:
    # Instead of listing jobs, we can directly create a job object and write letter
    job = Job(
        source_id=source_id,
        source="rss",
        title="Software Engineer",
        company="SAP",
        url="https://example.com/job",
        location="Berlin",
        description="Build Python APIs for internal tools.",
    )
    vault.write_letter(job, "Dear team", model="test", tokens_in=0, tokens_out=0)


@pytest.mark.parametrize("test_case", [
    ("https://example.com/jobs/42", "https%3A%2F%2Fexample.com%2Fjobs%2F42"),
    ("https://example.com/jobs/", "https%3A%2F%2Fexample.com%2Fjobs%2F"),
])
def test_get_job_url_id(api_client, api_vault, test_case):
    """Test getting a job with URL-shaped source_id."""
    sid, enc = test_case
    vault = _seed_job(api_vault, sid, status="shortlist")
    # Write a letter using the vault's write_letter method
    _seed_letter(vault, sid)

    response = api_client.get(f"/jobs/{enc}")
    assert response.status_code == 200
    assert response.json()["source_id"] == sid


def test_patch_job_url_id(api_client, api_vault):
    """Test patching a job with URL-shaped source_id."""
    sid = "https://example.com/jobs/42"
    enc = quote(sid, safe="")
    vault = _seed_job(api_vault, sid, status="shortlist")
    # Write a letter using the vault's write_letter method
    _seed_letter(vault, sid)

    response = api_client.patch(f"/jobs/{enc}", json={"status": "approved"})
    assert response.status_code == 200


def test_letter_get_put_url_id(api_client, api_vault):
    """Test getting and putting a letter with URL-shaped source_id."""
    sid = "https://example.com/jobs/42"
    enc = quote(sid, safe="")
    vault = _seed_job(api_vault, sid, status="shortlist")
    # Write a letter using the vault's write_letter method
    _seed_letter(vault, sid)

    # Test GET letter
    response = api_client.get(f"/jobs/{enc}/letter")
    assert response.status_code == 200

    # Test PUT letter
    response = api_client.put(f"/jobs/{enc}/letter", json={"body": "x"})
    assert response.status_code == 200


def test_regenerate_url_id(api_client, api_vault, secret_store, monkeypatch):
    """POST /jobs/{enc}/letter/regenerate works for a URL-shaped id."""
    sid = "https://example.com/jobs/42"
    enc = quote(sid, safe="")
    vault = _seed_job(api_vault, sid, status="shortlist")
    _seed_letter(vault, sid)
    secret_store.save(SecretName.gemini, "test-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setattr(
        "jobhunt.features.write.letters._call_gemini",
        lambda *a, **k: ("Dear team, new letter.", 10, 20),
    )
    response = api_client.post(f"/jobs/{enc}/letter/regenerate")
    assert response.status_code == 200
    assert response.json()["source_id"] == sid


def test_trailing_slash_id(api_client, api_vault):
    """Test handling of trailing slash in source_id."""
    sid = "https://example.com/jobs/"
    enc = quote(sid, safe="")
    vault = _seed_job(api_vault, sid, status="shortlist")
    # Write a letter using the vault's write_letter method
    _seed_letter(vault, sid)

    response = api_client.get(f"/jobs/{enc}")
    assert response.status_code == 200
