"""Isolate connector secrets so tests never touch a real Keychain or repo .secrets/."""

from __future__ import annotations

import pytest

from jobhunt.features.secrets.store import reset_store


@pytest.fixture(autouse=True)
def isolate_connector_secrets(tmp_path, monkeypatch):
    """Force the file fallback into a temp dir and reset the process store.

    Purpose: a leaked Keychain call must not use the developer Mac or git tree.
    Does not: inject MemoryKeychain by itself — HTTP tests still pass a mock.
    """

    monkeypatch.setenv("JOBHUNT_SECRETS_DIR", str(tmp_path / "connector-secrets"))
    reset_store()
    yield
    reset_store()
