"""Store protocol tests for Markdown and SQLite adapters."""

from __future__ import annotations

from pathlib import Path

from jobhunt.models import Job
from jobhunt.store.markdown_vault import MarkdownVaultStore
from jobhunt.store.sqlite import SqliteStore
from jobhunt.vault import init_workspace
from jobhunt.config import AppConfig


def test_markdown_store_round_trip(tmp_path: Path) -> None:
    vault_root = tmp_path / "vault"
    cfg = AppConfig(vault_path=vault_root, storage_backend="markdown", config_path=tmp_path / "c.yaml")
    init_workspace(cfg)
    store = MarkdownVaultStore(vault_root)
    store.ensure_dirs()
    job = Job(
        source_id="t1",
        source="test",
        title="Engineer",
        company="Acme",
        description="Build things",
    )
    store.upsert_job(job)
    notes = store.iter_job_notes()
    assert any(n.metadata.get("source_id") == "t1" for n in notes)
    store.write_letter(job, "Dear Acme,\n\nHello.\n", model="test", tokens_in=1, tokens_out=2)
    letter = store.get_letter("t1")
    assert letter is not None
    assert "Dear Acme" in letter.body
    store.save_letter_body("t1", "Edited letter")
    assert store.get_letter("t1").body == "Edited letter"
    doc = store.add_document(
        kind="cv",
        label="Master",
        original_name="cv.md",
        mime="text/markdown",
        raw=b"# CV\nPython\n",
        extracted_text="# CV\nPython\n",
        active_cv=True,
    )
    assert doc.active_cv
    assert "Python" in (store.read_cv() or "")


def test_sqlite_store_round_trip(tmp_path: Path) -> None:
    store = SqliteStore(tmp_path / "data")
    store.ensure_dirs()
    job = Job(
        source_id="s1",
        source="test",
        title="PM",
        company="Beta",
        description="Lead product",
        salary="80k",
    )
    store.upsert_job(job, status="inbox")
    assert "s1" in store.existing_source_ids()
    store.update_job_meta("s1", status="shortlist", score=0.9)
    note = next(n for n in store.iter_job_notes() if n.metadata["source_id"] == "s1")
    assert note.metadata["status"] == "shortlist"
    store.write_letter(job, "Subject: Hello\n\nBody", model="m", tokens_in=3, tokens_out=4)
    assert store.get_letter("s1") is not None
    doc = store.add_document(
        kind="cv",
        label="CV",
        original_name="a.txt",
        mime="text/plain",
        raw=b"skills: go",
        extracted_text="skills: go",
        active_cv=True,
    )
    listed = store.list_documents()
    assert len(listed) == 1
    assert store.document_text(doc.id) == "skills: go"
    assert store.delete_document(doc.id)
    store.close()
