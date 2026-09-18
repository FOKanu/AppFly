"""Write-only connector secrets: Keychain mock, HTTP flags, no echo."""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.config import AppConfig
from jobhunt.features.secrets.keychain import FileKeychain, MemoryKeychain
from jobhunt.features.secrets.names import (
    JOBSUCHE_PUBLIC_DEFAULT,
    SecretName,
    UnknownSecretError,
)
from jobhunt.features.secrets.store import (
    EmptySecretError,
    SecretStore,
    get_for_runtime,
    reset_store,
)


SECRET = "gemini-super-secret-value-abc123"


def _client(store: SecretStore | None = None) -> tuple[TestClient, SecretStore]:
    """HTTP client with a mocked Keychain.

    Purpose: tests never talk to macOS Keychain or the file fallback.
    """

    store = store or SecretStore(MemoryKeychain())
    return TestClient(create_app(store=store)), store


def test_put_then_get_settings_shows_configured_without_secret() -> None:
    client, store = _client()
    res = client.put("/settings/secrets/gemini", json={"value": SECRET})
    assert res.status_code == 200
    assert res.json() == {"configured": True}
    assert SECRET not in res.text

    res = client.get("/settings")
    assert res.status_code == 200
    body = res.json()
    secrets = body["secrets"]
    assert secrets == {"gemini": True, "apify": False, "jobsuche": False}
    assert all(isinstance(flag, bool) for flag in secrets.values())
    assert SECRET not in res.text
    assert "abc123" not in res.text
    assert "last" not in json.dumps(body).casefold()
    assert store.get_for_runtime(SecretName.gemini) == SECRET


def test_delete_unsets_configured() -> None:
    client, store = _client()
    client.put("/settings/secrets/apify", json={"value": "apify-token-secret"})
    assert client.get("/settings").json()["secrets"]["apify"] is True

    res = client.delete("/settings/secrets/apify")
    assert res.status_code == 200
    assert res.json() == {"configured": False}
    assert "apify-token-secret" not in res.text
    assert client.get("/settings").json()["secrets"]["apify"] is False
    assert store.get_for_runtime(SecretName.apify) is None


def test_unknown_name_400() -> None:
    client, _store = _client()
    res = client.put("/settings/secrets/openai", json={"value": "sk-nope"})
    assert res.status_code == 400
    detail = res.json()["detail"]
    assert "openai" in detail
    assert "sk-nope" not in res.text

    res = client.delete("/settings/secrets/not-a-connector")
    assert res.status_code == 400
    assert "not-a-connector" in res.json()["detail"]


def test_get_settings_does_not_call_get_for_runtime() -> None:
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "runtime-only-key")

    def boom(_name: SecretName) -> str | None:
        raise AssertionError("GET /settings must not call get_for_runtime")

    store.get_for_runtime = boom  # type: ignore[method-assign]
    client = TestClient(create_app(store=store))
    res = client.get("/settings")
    assert res.status_code == 200
    assert res.json()["secrets"]["gemini"] is True
    assert "runtime-only-key" not in res.text


def test_secret_path_has_no_get() -> None:
    client, _store = _client()
    client.put("/settings/secrets/gemini", json={"value": "hidden-key"})
    res = client.get("/settings/secrets/gemini")
    assert res.status_code in {404, 405}
    assert "hidden-key" not in res.text


def test_rotate_overwrites() -> None:
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "old-key")
    store.save(SecretName.gemini, "new-key")
    assert store.get_for_runtime(SecretName.gemini) == "new-key"
    assert store.is_configured(SecretName.gemini) is True


def test_put_empty_value_400() -> None:
    client, store = _client()
    res = client.put("/settings/secrets/gemini", json={"value": "   "})
    assert res.status_code == 400
    assert store.is_configured(SecretName.gemini) is False


def test_jobsuche_public_default_is_not_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    reset_store(None)
    monkeypatch.setenv("JOBSUCHE_API_KEY", JOBSUCHE_PUBLIC_DEFAULT)
    client, _store = _client()
    assert client.get("/settings").json()["secrets"]["jobsuche"] is False
    cfg = AppConfig()
    assert cfg.jobsuche_api_key == JOBSUCHE_PUBLIC_DEFAULT


def test_jobsuche_saved_override_is_configured() -> None:
    client, store = _client()
    client.put("/settings/secrets/jobsuche", json={"value": "custom-ba-key"})
    assert client.get("/settings").json()["secrets"]["jobsuche"] is True
    assert store.get_for_runtime(SecretName.jobsuche) == "custom-ba-key"


def test_config_prefers_store_then_env(monkeypatch: pytest.MonkeyPatch) -> None:
    store = SecretStore(MemoryKeychain())
    store.save(SecretName.gemini, "from-store")
    store.save(SecretName.apify, "from-store-apify")
    reset_store(store)
    monkeypatch.setenv("GEMINI_API_KEY", "from-env")
    monkeypatch.setenv("APIFY_TOKEN", "from-env-apify")

    cfg = AppConfig()
    assert cfg.gemini_api_key == "from-store"
    assert cfg.apify_token == "from-store-apify"

    store.delete(SecretName.gemini)
    store.delete(SecretName.apify)
    assert cfg.gemini_api_key == "from-env"
    assert cfg.apify_token == "from-env-apify"
    assert get_for_runtime(SecretName.gemini) is None
    reset_store(None)


def test_file_keychain_roundtrip(tmp_path: Path) -> None:
    store = SecretStore(FileKeychain(tmp_path))
    store.save(SecretName.apify, " file-token ")
    assert store.is_configured(SecretName.apify) is True
    assert store.get_for_runtime(SecretName.apify) == "file-token"
    path = tmp_path / "apify"
    assert path.read_text(encoding="utf-8") == "file-token"
    assert path.stat().st_mode & 0o777 == 0o600
    store.delete(SecretName.apify)
    assert store.is_configured(SecretName.apify) is False
    assert not path.exists()


def test_unknown_name_raises_in_store() -> None:
    store = SecretStore(MemoryKeychain())
    with pytest.raises(UnknownSecretError):
        store.save("openai", "x")
    with pytest.raises(EmptySecretError):
        store.save(SecretName.gemini, "  ")


def test_memory_keychain_is_the_mock() -> None:
    keychain = MemoryKeychain()
    store = SecretStore(keychain)
    store.save(SecretName.gemini, SECRET)
    assert keychain.get_password("gemini") == SECRET
    store.delete(SecretName.gemini)
    assert keychain.get_password("gemini") is None
    assert os.environ.get("GEMINI_API_KEY", "") != SECRET
