"""Settings GET/PUT tests — GET must never echo API keys."""

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient


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
    assert data["secrets"]["gemini"] is False
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
