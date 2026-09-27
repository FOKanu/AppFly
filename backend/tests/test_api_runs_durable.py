"""Durable async runs: persistence, single-run lock, cancel, dedupe, SQLite WAL."""

from __future__ import annotations

import threading
import time
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient

import jobhunt.features.pipeline.run_all as pipeline
from jobhunt.api import runner
from jobhunt.api.app import create_app
from jobhunt.config import load_config
from jobhunt.features.pipeline.run_all import PipelineResult, run_all
from jobhunt.features.secrets.store import SecretStore
from jobhunt.features.write import letters
from jobhunt.store.sqlite.store import SqliteStore
from jobhunt.store.types import RunRecord, utc_now

TERMINAL = {"completed", "failed", "cancelled"}


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


def _result(**overrides: Any) -> PipelineResult:
    values: dict[str, Any] = {"started": datetime.now().astimezone(), "model": "test-model"}
    values.update(overrides)
    return PipelineResult(**values)


def _wait(client: TestClient, run_id: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for _ in range(200):
        data = client.get(f"/runs/{run_id}").json()
        if data.get("status") in TERMINAL:
            return data
        time.sleep(0.02)
    return data


def _join_workers() -> None:
    for thread in threading.enumerate():
        if thread.name.startswith("run-"):
            thread.join(timeout=5)


def _restart(config_path: Path, secret_store: SecretStore) -> TestClient:
    """Simulate a server restart: drop in-memory runs, build a new app on the same store."""

    _join_workers()
    runner.reset_runs()
    return _client(config_path, secret_store)


def test_failure_is_persisted_and_visible_after_restart(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(config: Any, vault: Any = None, **_kwargs: Any) -> PipelineResult:
        raise RuntimeError("pipeline exploded")

    monkeypatch.setattr("jobhunt.api.runner.run_all", boom)
    client = _client(native_config, secret_store)
    run_id = client.post("/runs").json()["id"]
    data = _wait(client, run_id)
    assert data["status"] == "failed"
    assert data["errors"] == ["RuntimeError: pipeline exploded"]

    restarted = _restart(native_config, secret_store)
    after = restarted.get(f"/runs/{run_id}")
    assert after.status_code == 200
    assert after.json()["status"] == "failed"
    assert after.json()["errors"] == ["RuntimeError: pipeline exploded"]
    assert after.json()["finished"]
    rows = [row for row in restarted.get("/runs").json() if row["id"] == run_id]
    assert len(rows) == 1
    assert rows[0]["status"] == "failed"
    assert rows[0]["error_count"] == 1


def test_second_run_returns_409_while_one_is_active(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    entered = threading.Event()
    release = threading.Event()

    def slow(config: Any, vault: Any = None, **_kwargs: Any) -> PipelineResult:
        entered.set()
        release.wait(5)
        return _result()

    monkeypatch.setattr("jobhunt.api.runner.run_all", slow)
    client = _client(native_config, secret_store)
    first = client.post("/runs")
    assert first.status_code == 200
    first_id = first.json()["id"]
    assert entered.wait(5)

    second = client.post("/runs")
    assert second.status_code == 409
    assert first_id in second.json()["detail"]

    release.set()
    assert _wait(client, first_id)["status"] == "completed"
    _join_workers()
    third = client.post("/runs")
    assert third.status_code == 200
    assert _wait(client, third.json()["id"])["status"] == "completed"


def test_cancel_between_stages_stops_before_writing(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    in_match = threading.Event()
    release = threading.Event()
    write_calls: list[int] = []

    def slow_match(*_args: Any, **_kwargs: Any) -> dict[str, int]:
        in_match.set()
        release.wait(5)
        return {"shortlisted": 1, "skipped": 0, "unchanged": 0}

    def fake_write(*_args: Any, **_kwargs: Any) -> dict[str, int]:
        write_calls.append(1)
        return {"written": 1, "skipped": 0, "capped": 0}

    monkeypatch.setattr(pipeline, "collect_jobs", lambda *_a, **_k: [])
    monkeypatch.setattr(pipeline, "match_jobs", slow_match)
    monkeypatch.setattr(pipeline, "write_letters", fake_write)
    client = _client(native_config, secret_store)
    run_id = client.post("/runs").json()["id"]
    assert in_match.wait(5)

    assert client.post(f"/runs/{run_id}/cancel").status_code == 200
    release.set()
    data = _wait(client, run_id)
    assert data["status"] == "cancelled"
    assert data["written"] == 0
    assert write_calls == []

    restarted = _restart(native_config, secret_store)
    assert restarted.get(f"/runs/{run_id}").json()["status"] == "cancelled"


def test_write_letters_stops_between_letters(monkeypatch: pytest.MonkeyPatch) -> None:
    stop = threading.Event()
    calls: list[Any] = []

    def fake_gemini(config: Any, packet: Any) -> tuple[str, int, int]:
        calls.append(packet)
        stop.set()
        return ("letter body", 1, 1)

    monkeypatch.setattr(letters, "_call_gemini", fake_gemini)
    monkeypatch.setattr(letters, "build_packet", lambda job, **_kwargs: job)
    posts = [SimpleNamespace(metadata={"status": "shortlist"}) for _ in range(3)]
    written: list[Any] = []
    vault = SimpleNamespace(
        load_requirements=lambda: None,
        read_cv=lambda: "cv text",
        read_voice_samples=list,
        iter_job_notes=lambda: posts,
        job_from_note=lambda post: SimpleNamespace(company="Acme", title="Dev"),
        read_company_body=lambda company: "",
        write_letter=lambda job, letter, **_kwargs: written.append(job),
    )
    config = SimpleNamespace(
        gemini_api_key="test-key", letter_cap=5, jd_excerpt_chars=100, gemini_model="m"
    )
    stats = letters.write_letters(config, vault, should_stop=stop.is_set)
    assert stats["stopped"] is True
    assert stats["written"] == 1
    assert len(calls) == 1
    assert len(written) == 1


def test_list_runs_has_one_row_per_run_with_status(
    native_config: Path,
    secret_store: SecretStore,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seed = SqliteStore(tmp_path / "data")
    seed.append_run_note("2020-01-01", "### Old run\n")
    seed.close()

    def fake(config: Any, vault: Any = None, **_kwargs: Any) -> PipelineResult:
        today = datetime.now().astimezone().date().isoformat()
        vault.append_run_note(today, "### Run\n")
        return _result(scouted=3, shortlisted=2, written=1)

    monkeypatch.setattr("jobhunt.api.runner.run_all", fake)
    client = _client(native_config, secret_store)
    run_id = client.post("/runs").json()["id"]
    assert _wait(client, run_id)["status"] == "completed"
    _join_workers()

    for current in (client, _restart(native_config, secret_store)):
        rows = current.get("/runs").json()
        ids = [row["id"] for row in rows]
        assert len(ids) == len(set(ids))
        run_rows = [row for row in rows if row["id"] == run_id]
        assert len(run_rows) == 1
        row = run_rows[0]
        assert row["status"] == "completed"
        assert row["kind"] == "run"
        assert row["counts"] == {"scouted": 3, "matched": 2, "written": 1}
        assert row["error_count"] == 0
        assert row["started_at"] and row["finished_at"]
        today = datetime.now().astimezone().date().isoformat()
        assert today not in ids
        assert "2020-01-01" in ids


def test_get_run_unknown_id_is_404(native_config: Path, secret_store: SecretStore) -> None:
    client = _client(native_config, secret_store)
    assert client.get("/runs/does-not-exist").status_code == 404


def test_stale_stored_run_is_reported_as_failed(
    native_config: Path, secret_store: SecretStore, tmp_path: Path
) -> None:
    seed = SqliteStore(tmp_path / "data")
    seed.upsert_run_status(RunRecord(id="stalerun0001", status="running", started=utc_now()))
    seed.close()
    client = _client(native_config, secret_store)
    data = client.get("/runs/stalerun0001").json()
    assert data["status"] == "failed"
    assert any("interrupted" in err for err in data["errors"])
    assert client.post("/runs/stalerun0001/cancel").status_code == 404


def test_sqlite_store_uses_wal_and_is_thread_safe(tmp_path: Path) -> None:
    store = SqliteStore(tmp_path / "data")
    try:
        assert store.journal_mode() == "wal"
        failures: list[BaseException] = []

        def hammer(n: int) -> None:
            try:
                for i in range(20):
                    rec = RunRecord(id=f"t{n}-{i}", status="completed", started=utc_now())
                    store.upsert_run_status(rec)
                    store.list_run_notes()
            except BaseException as exc:  # noqa: BLE001 - surfaced by the assert below
                failures.append(exc)

        threads = [threading.Thread(target=hammer, args=(n,)) for n in range(8)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=10)
        assert failures == []
        assert len([r for r in store.list_run_notes() if r.id.startswith("t")]) == 160
    finally:
        store.close()


def test_run_all_closes_only_the_store_it_opened(
    native_config: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(pipeline, "collect_jobs", lambda *_a, **_k: [])
    monkeypatch.setattr(
        pipeline, "match_jobs", lambda *_a, **_k: {"shortlisted": 0, "skipped": 0, "unchanged": 0}
    )
    monkeypatch.setattr(
        pipeline, "write_letters", lambda *_a, **_k: {"written": 0, "skipped": 0, "capped": 0}
    )
    closed: list[bool] = []
    real_get_store = pipeline.get_store

    def tracking_get_store(config: Any) -> Any:
        store = real_get_store(config)
        original_close = store.close

        def close() -> None:
            closed.append(True)
            original_close()

        store.close = close
        return store

    monkeypatch.setattr(pipeline, "get_store", tracking_get_store)
    cfg = load_config(native_config)
    run_all(cfg)
    assert closed == [True]

    injected = real_get_store(cfg)
    try:
        run_all(cfg, injected)
        assert injected.journal_mode() == "wal"
    finally:
        injected.close()
