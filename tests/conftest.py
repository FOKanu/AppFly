"""Shared TestClient factory for the local HTTP API.

Purpose: Point create_app at a temp config.yaml and vault.
Inputs: pytest tmp_path.
Returns: FastAPI TestClient.
Does not: Call Gemini, Agentur, or Apify.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app


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
def api_client(api_config: Path) -> TestClient:
    """HTTP client against create_app(config_path=temp).

    Purpose: Drive API routes in-process.
    Inputs: api_config fixture.
    Returns: TestClient.
    Does not: Bind a real TCP port.
    """

    return TestClient(create_app(config_path=api_config))


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
