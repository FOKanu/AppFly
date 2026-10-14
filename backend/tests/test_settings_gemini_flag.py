"""/settings and /workspace/status agree on "Gemini key configured" (bm3)."""

from __future__ import annotations

KEY = "x-bm3-test-key-4711"


def test_env_key_counts_in_settings_and_status(api_client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", KEY)
    settings = api_client.get("/settings")
    status = api_client.get("/workspace/status")
    assert settings.status_code == 200
    assert status.status_code == 200
    assert settings.json()["secrets"]["gemini"] is True
    assert status.json()["has_gemini"] is True
    assert KEY not in settings.text
    assert KEY not in status.text


def test_no_key_anywhere_is_false_in_both(api_client, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    settings = api_client.get("/settings")
    status = api_client.get("/workspace/status")
    assert settings.json()["secrets"]["gemini"] is False
    assert status.json()["has_gemini"] is False


def test_env_apify_token_counts(api_client, monkeypatch):
    monkeypatch.setenv("APIFY_TOKEN", "apify-bm3-secret-99")
    settings = api_client.get("/settings")
    assert settings.json()["secrets"]["apify"] is True
    assert "apify-bm3-secret-99" not in settings.text
