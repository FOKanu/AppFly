"""Test regenerate letter error handling."""

import pytest
from google.genai.errors import ClientError, ServerError
from httpx import ConnectError
from jobhunt.features.secrets.names import SecretName
from pathlib import Path
from jobhunt.models import Job
from jobhunt.vault import Vault


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


def test_regenerate_errors_case_1(
    api_client, api_vault, secret_store, monkeypatch
):
    """Test that regenerate letter endpoint handles API key error correctly."""
    _seed_job(api_vault, "ref-1", status="shortlist")
    secret_store.save(SecretName.gemini, "test-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    # Patch _call_gemini to raise the specified error
    def fake_call_gemini(*args, **kwargs):
        raise ClientError(
            400,
            {
                "error": {
                    "code": 400,
                    "message": "API key not valid AIzaSyFAKEFAKEFAKEFAKEFAKE00",
                    "status": "INVALID_ARGUMENT",
                    "details": [{"reason": "API_KEY_INVALID"}],
                }
            },
        )

    monkeypatch.setattr("jobhunt.features.write.letters._call_gemini", fake_call_gemini)

    response = api_client.post("/jobs/ref-1/letter/regenerate")
    assert response.status_code == 400
    assert response.json()["detail"] == "Gemini rejected the API key. Replace it in Settings → API keys."
    # Additional assertions for case 1
    assert "AIza" not in response.text
    assert "host" not in response.json()["detail"]


@pytest.mark.parametrize(
    "error,expected_status,expected_detail",
    [
        (
            ClientError(
                403,
                {
                    "error": {
                        "code": 403,
                        "status": "PERMISSION_DENIED",
                        "message": "leaked",
                    }
                },
            ),
            400,
            "Gemini rejected the API key. Replace it in Settings → API keys.",
        ),
        (
            ClientError(
                429,
                {
                    "error": {
                        "code": 429,
                        "status": "RESOURCE_EXHAUSTED",
                    }
                },
            ),
            429,
            "Gemini rate limit or quota reached. Wait a minute, then try again.",
        ),
        (
            ServerError(
                503,
                {
                    "error": {
                        "code": 503,
                        "status": "UNAVAILABLE",
                        "message": "x",
                    }
                },
            ),
            502,
            "Gemini request failed (HTTP 503 UNAVAILABLE). Try again later.",
        ),
        (
            ConnectError("boom"),
            502,
            "Couldn't reach Gemini. Check your internet connection, then try again.",
        ),
        (
            ClientError(400, {"error":{"code":400,"status":"INVALID_ARGUMENT","message":"Request contains an invalid argument."}}),
            502,
            "Gemini request failed (HTTP 400 INVALID_ARGUMENT). Try again later.",
        ),
    ],
)
def test_regenerate_errors(
    api_client, api_vault, secret_store, monkeypatch, error, expected_status, expected_detail
):
    """Test that regenerate letter endpoint handles various errors correctly."""
    _seed_job(api_vault, "ref-1", status="shortlist")
    secret_store.save(SecretName.gemini, "test-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    # Patch _call_gemini to raise the specified error
    def fake_call_gemini(*args, **kwargs):
        raise error

    monkeypatch.setattr("jobhunt.features.write.letters._call_gemini", fake_call_gemini)

    response = api_client.post("/jobs/ref-1/letter/regenerate")
    assert response.status_code == expected_status
    assert response.json()["detail"] == expected_detail


def test_regenerate_empty_letter(api_client, api_vault, secret_store, monkeypatch):
    """Test that regenerate letter endpoint handles empty letter correctly."""
    from types import SimpleNamespace

    _seed_job(api_vault, "ref-1", status="shortlist")
    secret_store.save(SecretName.gemini, "test-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    # Define a fake client class for empty letter case
    class FakeEmptyGenaiClient:
        def __init__(self, *args, **kwargs):
            pass

        @property
        def models(self):
            return self

        def generate_content(self, *args, **kwargs):
            return SimpleNamespace(text="", usage_metadata=None)

    monkeypatch.setattr("google.genai.Client", FakeEmptyGenaiClient)

    response = api_client.post("/jobs/ref-1/letter/regenerate")
    assert response.status_code == 502
    assert response.json()["detail"] == "Gemini returned an empty letter. Try again."


def test_regenerate_no_letter_written_after_failure(api_client, api_vault, secret_store, monkeypatch):
    """Test that no letter is written after a failed regeneration."""
    from google.genai.errors import ClientError

    _seed_job(api_vault, "ref-1", status="shortlist")
    secret_store.save(SecretName.gemini, "test-key")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    # Patch _call_gemini to raise a key error
    def fake_call_gemini(*args, **kwargs):
        raise ClientError(
            400,
            {
                "error": {
                    "code": 400,
                    "message": "API key not valid AIzaSyFAKEFAKEFAKEFAKEFAKE00",
                    "status": "INVALID_ARGUMENT",
                    "details": [{"reason": "API_KEY_INVALID"}],
                }
            },
        )

    monkeypatch.setattr("jobhunt.features.write.letters._call_gemini", fake_call_gemini)

    # First, try to regenerate (should fail)
    response = api_client.post("/jobs/ref-1/letter/regenerate")
    assert response.status_code == 400

    # Then check that no letter was written
    response = api_client.get("/jobs/ref-1/letter")
    assert response.status_code == 404
