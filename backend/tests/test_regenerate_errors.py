"""Test regenerate letter error handling."""

import pytest
from google.genai.errors import ClientError, ServerError
from httpx import ConnectError
from jobhunt.features.secrets.names import SecretName
from tests.test_api_jobs import _seed_job


@pytest.mark.parametrize(
    "error,expected_status,expected_detail",
    [
        (
            ClientError(
                400,
                {
                    "error": {
                        "code": 400,
                        "message": "API key not valid AIzaSyFAKEFAKEFAKEFAKEFAKE00",
                        "status": "INVALID_ARGUMENT",
                        "details": [{"reason": "API_KEY_INVALID"}],
                    }
                },
            ),
            400,
            "Gemini rejected the API key. Replace it in Settings → API keys.",
        ),
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
    assert expected_detail in response.json()["detail"]
    # Additional assertions for case 1
    if expected_status == 400 and "API key not valid" in str(error):
        assert "AIza" not in response.text
        assert "host" not in response.json()["detail"]


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
    assert "Gemini returned an empty letter. Try again." in response.json()["detail"]


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
