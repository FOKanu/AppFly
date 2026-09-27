"""Shared TestClient factory for the local HTTP API.

Purpose: Point create_app at a temp config.yaml, vault, and MemoryKeychain.
Inputs: pytest tmp_path.
Returns: FastAPI TestClient.
Does not: Call Gemini, Agentur, or Apify, or touch the OS Keychain.
"""

from __future__ import annotations

import threading
from collections.abc import Iterator
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.secrets.keychain import MemoryKeychain
from jobhunt.features.secrets.store import SecretStore, reset_store


@pytest.fixture
def api_config(tmp_path: Path) -> Path:
    """Write a temp config.yaml with Agentur off.

    Purpose: Isolate tests from the real vault and live job APIs.
    Inputs: pytest tmp_path.
    Returns: Path to config.yaml (vault_path is tmp_path/vault).
    Does not: Copy API keys into YAML.
    """

    vault = tmp_path / "vault"
    vault.mkdir()
    (vault / "Jobs").mkdir()
    (vault / "Letters").mkdir()
    (vault / "Runs").mkdir()
    (vault / "CV").mkdir()
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        yaml.safe_dump(
            {
                "vault_path": str(vault),
                "storage_backend": "markdown",
                "keywords": ["Python"],
                "location": "Berlin",
                "sources": {
                    "agentur": False,
                    "inbox": True,
                    "rss": [],
                    "apify": {"enabled": False, "start_urls": []},
                },
            },
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    return config_path


@pytest.fixture
def secret_store() -> Iterator[SecretStore]:
    """In-memory Keychain for API tests.

    Purpose: Tests never talk to macOS Keychain or ``.secrets/``.
    Inputs: None.
    Returns: ``SecretStore`` wrapping ``MemoryKeychain``.
    Does not: Persist across tests.
    """

    store = SecretStore(MemoryKeychain())
    reset_store(store)
    yield store
    reset_store(None)


@pytest.fixture
def api_client(api_config: Path, secret_store: SecretStore) -> TestClient:
    """HTTP client against create_app(config_path=temp).

    Purpose: Drive API routes in-process.
    Inputs: api_config and secret_store fixtures.
    Returns: TestClient.
    Does not: Bind a real TCP port.
    Uses trusted host and CSRF header.
    """

    return TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )


@pytest.fixture
def api_vault(api_config: Path) -> Path:
    """Temp vault root from the test config.

    Purpose: Let tests seed job notes through ``Vault``.
    Inputs: api_config fixture.
    Returns: Vault directory Path.
    Does not: Fetch listings.
    """

    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    return Path(raw["vault_path"])


@pytest.fixture(autouse=True)
def _isolate_async_runs() -> Iterator[None]:
    """Start and end every test with no in-memory pipeline runs.

    Purpose: The async runner is module-global and allows one active run at a time.
    Inputs: None.
    Returns: None (joins leftover ``run-*`` worker threads, then clears state).
    Does not: Touch any store on disk.
    """

    from jobhunt.api import runner

    runner.reset_runs()
    yield
    for thread in threading.enumerate():
        if thread.name.startswith("run-"):
            thread.join(timeout=5)
    runner.reset_runs()
