"""B4: cross-process run lock, heartbeats, CLI trigger, exit 75 when busy."""

from __future__ import annotations

import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from jobhunt.api.app import create_app
from jobhunt.cli import EXIT_BUSY, app
from jobhunt.features.secrets.store import SecretStore
from jobhunt.store.sqlite.store import SqliteStore
from jobhunt.store.types import RunRecord, utc_now


@pytest.fixture
def native_config(api_config: Path, tmp_path: Path) -> Path:
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    return api_config


def _client(config_path: Path, secret_store: SecretStore) -> TestClient:
    return TestClient(
        create_app(config_path=config_path, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )


def test_fresh_cli_run_blocks_post_runs(
    native_config: Path, secret_store: SecretStore, tmp_path: Path
) -> None:
    store = SqliteStore(tmp_path / "data")
    store.upsert_run_status(
        RunRecord(
            id="clirun000001",
            status="running",
            started=utc_now(),
            trigger="cli",
            owner="test:1",
            heartbeat=utc_now(),
        )
    )
    store.close()
    client = _client(native_config, secret_store)
    resp = client.post("/runs")
    assert resp.status_code == 409
    assert "clirun000001" in resp.json()["detail"]
    rows = [r for r in client.get("/runs").json() if r["id"] == "clirun000001"]
    assert len(rows) == 1
    assert rows[0]["trigger"] == "cli"
    assert rows[0]["interrupted"] is False
    assert rows[0]["status"] == "running"


def test_stale_heartbeat_marks_interrupted(
    native_config: Path, secret_store: SecretStore, tmp_path: Path
) -> None:
    old = (datetime.now().astimezone() - timedelta(seconds=120)).isoformat(timespec="seconds")
    store = SqliteStore(tmp_path / "data")
    store.upsert_run_status(
        RunRecord(
            id="stalehb00001",
            status="running",
            started=old,
            trigger="cli",
            heartbeat=old,
        )
    )
    store.close()
    client = _client(native_config, secret_store)
    data = client.get("/runs/stalehb00001").json()
    assert data["status"] == "failed"
    assert data["interrupted"] is True
    assert data["trigger"] == "cli"


def test_cross_process_cancel_sets_flag(
    native_config: Path, secret_store: SecretStore, tmp_path: Path
) -> None:
    store = SqliteStore(tmp_path / "data")
    store.upsert_run_status(
        RunRecord(
            id="cancelme0001",
            status="running",
            started=utc_now(),
            trigger="nightly",
            heartbeat=utc_now(),
        )
    )
    store.close()
    client = _client(native_config, secret_store)
    assert client.post("/runs/cancelme0001/cancel").status_code == 200
    store2 = SqliteStore(tmp_path / "data")
    assert store2.is_run_cancel_requested("cancelme0001") is True
    store2.close()


def test_cli_run_exits_75_when_busy(
    native_config: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    data = tmp_path / "data"
    store = SqliteStore(data)
    store.upsert_run_status(
        RunRecord(
            id="busyrun00001",
            status="running",
            started=utc_now(),
            trigger="api",
            heartbeat=utc_now(),
        )
    )
    store.close()

    def boom(*_a: Any, **_k: Any) -> Any:
        raise AssertionError("pipeline should not start when busy")

    monkeypatch.setattr("jobhunt.features.pipeline.run_all.run_all", boom)
    result = CliRunner().invoke(app, ["run", "--config", str(native_config), "--trigger", "cli"])
    assert result.exit_code == EXIT_BUSY, result.output
    assert "busyrun00001" in (result.output or "") + (result.stderr or "")
