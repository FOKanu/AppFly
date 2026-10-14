"""Settings GET/PUT tests — GET must never echo API keys."""

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.config import AppConfig
from jobhunt.features.secrets.store import SecretStore


FAKE_GEMINI_KEY = "AIzaSy-test-secret-key-x9Q2"
FAKE_APIFY_TOKEN = "apify_api_TESTSECRETTOKEN_x9Q2"


def test_get_settings_never_contains_gemini_key(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_GEMINI_KEY)
    monkeypatch.setenv("APIFY_API_TOKEN", FAKE_APIFY_TOKEN)
    response = api_client.get("/settings")
    assert response.status_code == 200
    body = response.text
    assert "AIza" not in body
    assert FAKE_GEMINI_KEY not in body
    assert FAKE_APIFY_TOKEN not in body
    assert "x9Q2" not in body
    data = response.json()
    assert "GEMINI_API_KEY" not in body
    assert data["secrets"]["gemini"] is True  # bm3: an env key counts as configured (presence only)
    assert data["secrets"]["apify"] is False
    assert data["secrets"]["jobsuche"] is False
    assert data["keywords"] == ["Python"]
    assert data["location"] == "Berlin"
    assert "vault_path" in data
    assert "health" in data
    assert set(data["secrets"]) == {"gemini", "apify", "jobsuche"}


def test_get_settings_secret_flags_false_when_env_empty(
    api_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("APIFY_API_TOKEN", "")
    monkeypatch.setenv("APIFY_TOKEN", "")
    monkeypatch.setenv("APIFY_API_KEY", "")
    response = api_client.get("/settings")
    assert response.status_code == 200
    assert response.json()["secrets"] == {"gemini": False, "apify": False, "jobsuche": False}


def test_put_settings_updates_yaml(api_client: TestClient, api_config: Path) -> None:
    response = api_client.put(
        "/settings",
        json={
            "keywords": ["Rust", "Python"],
            "location": "Hamburg",
            "rss": ["https://careers.example.com/feed.xml"],
            "sources": {"agentur": False, "inbox": True},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["keywords"] == ["Rust", "Python"]
    assert data["location"] == "Hamburg"
    assert data["sources"]["rss"] == ["https://careers.example.com/feed.xml"]
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    assert raw["keywords"] == ["Rust", "Python"]
    assert raw["sources"]["rss"] == ["https://careers.example.com/feed.xml"]
    assert "gemini_api_key" not in raw


def test_put_settings_rejects_gemini_api_key(
    api_client: TestClient, api_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    response = api_client.put(
        "/settings",
        json={"gemini_api_key": FAKE_GEMINI_KEY, "keywords": ["Nope"]},
    )
    assert response.status_code == 400
    assert FAKE_GEMINI_KEY not in response.text
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    assert raw["keywords"] == ["Python"]
    assert "gemini_api_key" not in raw
    follow = api_client.get("/settings")
    assert FAKE_GEMINI_KEY not in follow.text
    assert "AIza" not in follow.text


def test_put_settings_rejects_unknown_keys(api_client: TestClient) -> None:
    response = api_client.put("/settings", json={"not_a_real_field": True})
    assert response.status_code == 422


def test_put_settings_rejects_denied_rss(api_client: TestClient) -> None:
    response = api_client.put(
        "/settings",
        json={"rss": ["https://www.linkedin.com/jobs/feed"]},
    )
    assert response.status_code == 400
    assert "linkedin" in response.text.casefold()


def test_get_settings_exposes_default_caps(api_client: TestClient) -> None:
    """Test that GET /settings returns default values for caps."""
    response = api_client.get("/settings")
    assert response.status_code == 200
    data = response.json()

    # Check default values from AppConfig
    assert data["letter_cap"] == AppConfig.model_fields["letter_cap"].default
    assert data["shortlist_size"] == AppConfig.model_fields["shortlist_size"].default
    assert data["gemini_model"] == AppConfig.model_fields["gemini_model"].default


def test_get_settings_caps_follow_config_yaml(api_config: Path, secret_store: SecretStore) -> None:
    """Test that GET /settings returns values from config.yaml."""
    # Modify the config file
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["letter_cap"] = 3
    raw["shortlist_size"] = 6
    raw["gemini_model"] = "gemini-test-model"
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")

    # Create a new client with the updated config
    updated_client = TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )

    response = updated_client.get("/settings")
    assert response.status_code == 200
    data = response.json()

    assert data["letter_cap"] == 3
    assert data["shortlist_size"] == 6
    assert data["gemini_model"] == "gemini-test-model"


def test_put_settings_rejects_caps(api_client: TestClient, api_config: Path) -> None:
    """Test that PUT /settings rejects caps fields with 422."""
    # Test letter_cap rejection
    response = api_client.put("/settings", json={"letter_cap": 99})
    assert response.status_code == 422

    # Test shortlist_size rejection
    response = api_client.put("/settings", json={"shortlist_size": 99})
    assert response.status_code == 422

    # Test gemini_model rejection
    response = api_client.put("/settings", json={"gemini_model": "x"})
    assert response.status_code == 422

    # Verify that the config is unchanged
    response = api_client.get("/settings")
    assert response.status_code == 200
    data = response.json()

    assert data["letter_cap"] == AppConfig.model_fields["letter_cap"].default
    assert data["shortlist_size"] == AppConfig.model_fields["shortlist_size"].default
    assert data["gemini_model"] == AppConfig.model_fields["gemini_model"].default
