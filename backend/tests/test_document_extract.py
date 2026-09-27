"""M1: document text extraction for PDF/DOCX/plain uploads."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.documents.extract import extract_document_text
from jobhunt.features.secrets.store import SecretStore
from jobhunt.store.sqlite.store import SqliteStore


def test_extract_plain_text_ok() -> None:
    result = extract_document_text(
        filename="cv.md",
        mime="text/markdown",
        raw=b"# Hello\n\nWorld",
    )
    assert result.status == "ok"
    assert "Hello" in result.text


def test_extract_plain_empty() -> None:
    result = extract_document_text(filename="empty.txt", mime="text/plain", raw=b"   ")
    assert result.status == "empty"
    assert result.text == ""


def test_extract_unknown_binary_unsupported() -> None:
    result = extract_document_text(
        filename="photo.png",
        mime="image/png",
        raw=b"\x89PNG\r\n",
    )
    assert result.status == "unsupported"


def test_extract_pdf_reports_known_status() -> None:
    result = extract_document_text(
        filename="cv.pdf",
        mime="application/pdf",
        raw=b"%PDF-1.4 minimal",
    )
    assert result.status in {"ok", "empty", "unsupported", "error"}


def test_extract_docx_reports_known_status() -> None:
    result = extract_document_text(
        filename="cv.docx",
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        raw=b"not-a-real-docx",
    )
    assert result.status in {"ok", "empty", "unsupported", "error"}



def test_upload_sets_extract_status(
    tmp_path: Path, api_config: Path, secret_store: SecretStore
) -> None:
    import yaml

    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    client = TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )
    resp = client.post(
        "/documents",
        files={"file": ("cv.md", b"# Master CV\n\nPython engineer.", "text/markdown")},
        data={"kind": "cv", "label": "Master", "active_cv": "true"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["extract_status"] == "ok"
    assert body["word_count"] > 0
    assert "body" not in body
    assert "extracted" not in body

    listed = client.get("/documents").json()
    assert listed[0]["extract_status"] == "ok"
    assert "body" not in listed[0]
    assert "text" not in listed[0]
    assert "extracted" not in listed[0]
    assert "content" not in listed[0]
    text_resp = client.get(f"/documents/{body['id']}/text")
    assert text_resp.status_code == 200
    assert "Python engineer" in text_resp.text

    meta = client.get(f"/documents/{body['id']}").json()
    assert "body" not in meta
    assert "text" not in meta
    assert meta["id"] == body["id"]

    store = SqliteStore(tmp_path / "data")
    try:
        assert store._conn.execute("SELECT value FROM meta WHERE key='schema_version'").fetchone()[0] == "3"
    finally:
        store.close()
