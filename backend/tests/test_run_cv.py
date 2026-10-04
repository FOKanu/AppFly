"""M2: optional CV document id on POST /runs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.secrets.store import SecretStore
from jobhunt.features.write.letters import _cv_slice, build_packet
from jobhunt.models import Job, Requirements
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


def _seed_docs(data_dir: Path) -> tuple[str, str, str]:
    """Return (active_cv_id, alt_cv_id, voice_id) with distinct extracted text."""

    store = SqliteStore(data_dir)
    store.ensure_dirs()
    active = store.add_document(
        kind="cv",
        label="Active",
        original_name="active.txt",
        mime="text/plain",
        raw=b"ACTIVE_CV_MARKER python",
        extracted_text="ACTIVE_CV_MARKER python",
        active_cv=True,
    )
    alt = store.add_document(
        kind="cv",
        label="Alt",
        original_name="alt.txt",
        mime="text/plain",
        raw=b"ALT_CV_MARKER rust",
        extracted_text="ALT_CV_MARKER rust",
        active_cv=False,
    )
    voice = store.add_document(
        kind="voice",
        label="Tone",
        original_name="voice.txt",
        mime="text/plain",
        raw=b"voice sample",
        extracted_text="voice sample",
    )
    store.close()
    return active.id, alt.id, voice.id


def _capture_start(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    captured: dict[str, Any] = {}

    def fake_start(
        config: Any,
        *,
        store: Any = None,
        on_update: Any = None,
        trigger: str = "api",
        cv_text: str | None = None,
    ) -> RunRecord:
        captured["cv_text"] = cv_text
        rec = RunRecord(
            id="testrun01",
            status="queued",
            started=utc_now(),
            model=getattr(config, "gemini_model", "") or "test",
            trigger=trigger,
        )
        if on_update is not None:
            on_update(rec)
        return rec

    monkeypatch.setattr("jobhunt.api.routes.runs.start_async_run", fake_start)
    return captured


def test_post_runs_no_body_still_200(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _seed_docs(tmp_path / "data")
    captured = _capture_start(monkeypatch)
    client = _client(native_config, secret_store)
    response = client.post("/runs")
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
    assert "ACTIVE_CV_MARKER" in (captured.get("cv_text") or "")


def test_post_runs_with_cv_id_uses_that_document(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _active_id, alt_id, _voice_id = _seed_docs(tmp_path / "data")
    captured = _capture_start(monkeypatch)
    client = _client(native_config, secret_store)
    response = client.post("/runs", json={"cv": alt_id})
    assert response.status_code == 200
    assert "ALT_CV_MARKER" in (captured.get("cv_text") or "")
    assert "ACTIVE_CV_MARKER" not in (captured.get("cv_text") or "")


def test_post_runs_unknown_cv_404(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _seed_docs(tmp_path / "data")
    _capture_start(monkeypatch)
    client = _client(native_config, secret_store)
    response = client.post("/runs", json={"cv": "does-not-exist"})
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_post_runs_non_cv_document_404(
    native_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    _active_id, _alt_id, voice_id = _seed_docs(tmp_path / "data")
    _capture_start(monkeypatch)
    client = _client(native_config, secret_store)
    response = client.post("/runs", json={"cv": voice_id})
    assert response.status_code == 404
    assert "not a cv" in response.json()["detail"].lower()


def test_sealed_packet_uses_one_cv_slice() -> None:
    """Writer packet still carries a single CV slice (no second CV mixed in)."""

    raw = "PRIMARY_CV_ONLY\n" + ("x" * 5000)
    sliced = _cv_slice(raw)
    job = Job(
        source_id="j1",
        source="test",
        title="Engineer",
        company="Acme",
        description="Build APIs",
    )
    packet = build_packet(
        job,
        cv_text=sliced,
        samples="",
        company_note="",
        requirements=Requirements(),
    )
    assert "PRIMARY_CV_ONLY" in packet
    assert packet.count("## Candidate CV (slice)") == 1
    assert len(sliced) <= 3500
