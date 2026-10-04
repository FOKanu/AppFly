"""Tests for run stage and write_cap persistence in SQLite."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.secrets.store import SecretStore
from jobhunt.store.sqlite.store import SqliteStore
from jobhunt.store.sqlite.schema import SCHEMA_VERSION
from jobhunt.store.types import RunRecord, utc_now


def test_v3_db_migrates_to_v4(tmp_path: Path) -> None:
    """Test that a v3 database migrates to v4 and preserves existing data."""
    # Create the data directory
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # First create a store to establish the initial DB structure
    store = SqliteStore(data_dir)
    db_file = store._conn.execute("PRAGMA database_list").fetchone()[2]
    store.close()

    # Now manually modify the DB to simulate v3 state
    conn = sqlite3.connect(db_file)

    # Remove the new columns that were added in v4
    conn.execute("ALTER TABLE runs DROP COLUMN stage")
    conn.execute("ALTER TABLE runs DROP COLUMN write_cap")

    # Set schema version to 3
    conn.execute("UPDATE meta SET value='3' WHERE key='schema_version'")

    # Insert a test run record
    conn.execute(
        "INSERT INTO runs (id, status) VALUES ('old1', 'completed')"
    )

    conn.commit()
    conn.close()

    # Now reopen with the new code - this should migrate to v4
    store = SqliteStore(data_dir)

    # Verify schema version is now 4
    version_row = store._conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()
    assert version_row[0] == str(SCHEMA_VERSION)

    # Verify the old run record still exists
    rows = store._conn.execute("SELECT * FROM runs WHERE id='old1'").fetchall()
    assert len(rows) == 1
    assert rows[0]["id"] == "old1"
    assert rows[0]["status"] == "completed"

    # Verify new columns exist (they should be NULL for the old record)
    run_info = store._conn.execute("PRAGMA table_info(runs)").fetchall()
    column_names = {col[1] for col in run_info}
    assert "stage" in column_names
    assert "write_cap" in column_names

    store.close()


def test_active_run_stage_and_cap_survive_reopen(tmp_path: Path) -> None:
    """Test that stage and write_cap persist through store reopens for active runs."""
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Create initial store
    store = SqliteStore(data_dir)

    # Upsert a running record with stage and write_cap
    record = RunRecord(
        id="r1",
        status="running",
        started=utc_now(),
        heartbeat=utc_now(),
        stage="match",
        write_cap=5
    )
    store.upsert_run_status(record)
    store.close()

    # Create new store instance
    store2 = SqliteStore(data_dir)

    # Read back the record
    records = store2.list_run_notes()
    assert len(records) == 1
    assert records[0].id == "r1"
    assert records[0].stage == "match"
    assert records[0].write_cap == 5

    store2.close()


def test_terminal_run_clears_stage_and_cap(tmp_path: Path) -> None:
    """Test that stage and write_cap are cleared when a run reaches terminal status."""
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Create initial store
    store = SqliteStore(data_dir)

    # Upsert a running record with stage and write_cap
    record = RunRecord(
        id="r2",
        status="running",
        started=utc_now(),
        heartbeat=utc_now(),
        stage="match",
        write_cap=5
    )
    store.upsert_run_status(record)

    # Now update to completed status (terminal)
    record.status = "completed"
    store.upsert_run_status(record)
    store.close()

    # Create new store instance
    store2 = SqliteStore(data_dir)

    # Read back the record
    records = store2.list_run_notes()
    assert len(records) == 1
    assert records[0].id == "r2"
    assert records[0].stage is None
    assert records[0].write_cap is None

    store2.close()


def test_settled_stale_run_clears_stage(tmp_path: Path) -> None:
    """Test that stale runs have their stage and write_cap cleared when settled as failed."""
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Create initial store
    store = SqliteStore(data_dir)

    # Upsert a running record with stage and write_cap
    record = RunRecord(
        id="r3",
        status="running",
        started=utc_now(),
        heartbeat="",  # Empty heartbeat to make it stale
        stage="write",
        write_cap=3
    )
    store.upsert_run_status(record)
    store.close()

    # Create new store instance and settle stale runs
    store2 = SqliteStore(data_dir)
    settled_ids = store2.settle_stale_active_runs()
    assert "r3" in settled_ids
    store2.close()

    # Check that the run was updated
    store3 = SqliteStore(data_dir)
    records = store3.list_run_notes()
    assert len(records) == 1
    assert records[0].id == "r3"
    assert records[0].status == "failed"
    assert records[0].stage is None
    assert records[0].write_cap is None

    store3.close()


def test_cli_run_stage_visible(tmp_path: Path) -> None:
    """Test that a CLI-style run with stage is visible through the API."""
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Create initial store
    store = SqliteStore(data_dir)

    # Upsert a running record with CLI trigger and stage
    record = RunRecord(
        id="cli_run",
        status="running",
        started=utc_now(),
        heartbeat=utc_now(),
        stage="match",
        write_cap=10,
        trigger="cli"
    )
    store.upsert_run_status(record)
    store.close()

    # Create new store instance and check via API
    store2 = SqliteStore(data_dir)

    # Read back the record
    records = store2.list_run_notes()
    assert len(records) == 1
    assert records[0].id == "cli_run"
    assert records[0].stage == "match"
    assert records[0].write_cap == 10
    assert records[0].trigger == "cli"

    store2.close()


def test_cli_run_stage_visible_via_api(
    tmp_path: Path, api_config: Path, secret_store: SecretStore
) -> None:
    """A running CLI/nightly row written by another process shows its stage and cap on GET /runs/{id}."""
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    seed = SqliteStore(tmp_path / "data")
    seed.upsert_run_status(
        RunRecord(
            id="clirun0001",
            status="running",
            started=utc_now(),
            heartbeat=utc_now(),
            stage="write",
            write_cap=4,
            trigger="cli",
        )
    )
    seed.close()
    client = TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )
    data = client.get("/runs/clirun0001").json()
    assert data["status"] == "running"
    assert data["stage"] == "write"
    assert data["write_cap"] == 4
