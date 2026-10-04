"""Test for heartbeat thread leak in runner."""

from __future__ import annotations

import threading
import time
from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app


def _client(config_path: Path, secret_store: Any) -> TestClient:
    return TestClient(
        create_app(config_path=config_path, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )


def _wait(client: TestClient, run_id: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for _ in range(200):
        data = client.get(f"/runs/{run_id}").json()
        if data.get("status") == "failed":
            return data
        time.sleep(0.02)
    return data


@pytest.fixture
def native_config(api_config: Path, tmp_path: Path) -> Path:
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    return api_config


def test_heartbeat_thread_leak_fixed(
    native_config: Path, secret_store: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Test that heartbeat threads are properly cleaned up even when run_all raises."""

    def crash(config: Any, vault: Any = None, *, on_progress: Any = None, **_kwargs: Any) -> None:
        raise RuntimeError("boom")

    monkeypatch.setattr("jobhunt.api.runner.run_all", crash)

    client = _client(native_config, secret_store)

    # Start a run that will fail
    run_id = client.post("/runs").json()["id"]

    # Wait for the run to fail
    data = _wait(client, run_id)
    assert data["status"] == "failed"

    # Poll for heartbeat thread cleanup (up to 3 seconds)
    timeout = time.time() + 3.0
    while time.time() < timeout:
        heartbeat_thread_exists = any(
            thread.name.startswith(f"heartbeat-{run_id}")
            for thread in threading.enumerate()
        )

        run_thread_exists = any(
            thread.name.startswith(f"run-{run_id}")
            for thread in threading.enumerate()
        )

        if not heartbeat_thread_exists and not run_thread_exists:
            break

        time.sleep(0.05)

    # Check that no heartbeat thread is left running
    heartbeat_thread_exists = any(
        thread.name.startswith(f"heartbeat-{run_id}")
        for thread in threading.enumerate()
    )

    assert not heartbeat_thread_exists, "Heartbeat thread should be cleaned up"
