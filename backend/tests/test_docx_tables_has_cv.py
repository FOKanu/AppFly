"""Tests for DOCX table extraction and CV status checking."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
import yaml

import pytest
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.documents.extract import extract_document_text
from jobhunt.features.secrets.store import SecretStore


def _native_client(tmp_path: Path, api_config: Path, secret_store: SecretStore) -> TestClient:
    """Helper to create a test client with native storage."""
    raw = yaml.safe_load(api_config.read_text(encoding="utf-8"))
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    api_config.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    return TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )


def test_docx_table_cells_extracted() -> None:
    """Test that DOCX table cells are extracted."""
    pytest.importorskip("docx")

    from docx import Document

    # Create a document with a table
    doc = Document()
    doc.add_paragraph("Intro")

    # Add a 2x2 table
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Skill"
    table.cell(0, 1).text = "Python"
    table.cell(1, 0).text = "Years"
    table.cell(1, 1).text = "7"

    # Save to BytesIO
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    result = extract_document_text(
        filename="cv.docx",
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        raw=buffer.getvalue(),
    )

    assert result.status == "ok"
    assert "Intro" in result.text
    assert "Python" in result.text
    assert "7" in result.text


def test_unreadable_cv_is_not_has_cv(tmp_path: Path, api_config: Path, secret_store: SecretStore) -> None:
    """Test that unreadable CVs don't count as having a CV."""
    client = _native_client(tmp_path, api_config, secret_store)

    # Upload a broken PDF CV
    resp = client.post(
        "/documents",
        files={"file": ("cv.pdf", b"not a pdf at all", "application/pdf")},
        data={"kind": "cv", "label": "Broken", "active_cv": "true"},
    )
    assert resp.status_code == 200

    # Check that has_cv is False
    status_resp = client.get("/workspace/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["has_cv"] is False


def test_readable_cv_is_has_cv(tmp_path: Path, api_config: Path, secret_store: SecretStore) -> None:
    """Test that readable CVs count as having a CV."""
    client = _native_client(tmp_path, api_config, secret_store)

    # Upload a readable MD CV
    resp = client.post(
        "/documents",
        files={"file": ("cv.md", b"# CV\n\nPython engineer.", "text/markdown")},
        data={"kind": "cv", "label": "Good", "active_cv": "true"},
    )
    assert resp.status_code == 200

    # Check that has_cv is True
    status_resp = client.get("/workspace/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["has_cv"] is True
