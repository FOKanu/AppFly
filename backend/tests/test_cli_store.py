"""CLI scout/match/write use the configured store (native SQLite or markdown vault)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest
import yaml
from typer.testing import CliRunner

import jobhunt.features.match as match_pkg
import jobhunt.features.write as write_pkg
from jobhunt.cli import app
from jobhunt.store.markdown_vault import MarkdownVaultStore
from jobhunt.store.sqlite.store import SqliteStore

CLIP = "---\ncompany: Zeiss\nurl: https://example.com/jobs/1\n---\n\n# Optics Engineer\n\nNice role.\n"


def _write_config(tmp_path: Path, backend: str) -> Path:
    vault = tmp_path / "vault"
    data = tmp_path / "data"
    config_path = tmp_path / "config.yaml"
    config_path.write_text(
        yaml.safe_dump(
            {
                "vault_path": str(vault),
                "storage_backend": backend,
                "native_data_dir": str(data),
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


def _invoke(*args: str) -> Any:
    return CliRunner().invoke(app, list(args))


@pytest.fixture
def record_close(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    calls: list[str] = []

    original = SqliteStore.close

    def fake_close(self: SqliteStore) -> None:
        calls.append("closed")
        original(self)

    monkeypatch.setattr(SqliteStore, "close", fake_close)
    return calls


def test_scout_native_writes_to_sqlite(tmp_path: Path, record_close: list[str]) -> None:
    """Test that scout writes to SQLite store when storage_backend is native."""
    cfg = _write_config(tmp_path, "native")
    inbox = tmp_path / "data" / "files" / "inbox"
    inbox.mkdir(parents=True)
    (inbox / "role.md").write_text(CLIP, encoding="utf-8")
    result = _invoke("scout", "--config", str(cfg))
    assert result.exit_code == 0, result.output
    assert record_close  # The CLI closed its store
    store = SqliteStore(tmp_path / "data")
    titles = [n.metadata.get("title") for n in store.iter_job_notes()]
    store.close()
    assert "Optics Engineer" in titles
    assert not (tmp_path / "vault" / "Jobs").exists()


def test_scout_markdown_writes_to_vault(tmp_path: Path) -> None:
    """Test that scout writes to Markdown vault when storage_backend is markdown."""
    cfg = _write_config(tmp_path, "markdown")
    inbox = tmp_path / "vault" / "_inbox"
    inbox.mkdir(parents=True)
    (inbox / "role.md").write_text(CLIP, encoding="utf-8")
    result = _invoke("scout", "--config", str(cfg))
    assert result.exit_code == 0
    assert list((tmp_path / "vault" / "Jobs").rglob("*.md"))  # at least one job note
    assert not (tmp_path / "data" / "appfly.sqlite").exists()


def test_match_native_uses_sqlite_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, record_close: list[str]) -> None:
    """Test that match uses SQLite store when storage_backend is native."""
    cfg = _write_config(tmp_path, "native")
    seen: list[Any] = []

    def fake_match(config: Any, store: Any) -> dict[str, int]:
        seen.append(store)
        return {"shortlisted": 1, "skipped": 0, "unchanged": 0}

    monkeypatch.setattr(match_pkg, "match_jobs", fake_match)
    result = _invoke("match", "--config", str(cfg))
    assert result.exit_code == 0
    assert "Shortlisted 1" in result.output
    assert len(seen) == 1 and isinstance(seen[0], SqliteStore)
    assert record_close


def test_match_markdown_uses_vault_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that match uses Markdown vault store when storage_backend is markdown."""
    cfg = _write_config(tmp_path, "markdown")
    seen: list[Any] = []

    def fake_match(config: Any, store: Any) -> dict[str, int]:
        seen.append(store)
        return {"shortlisted": 1, "skipped": 0, "unchanged": 0}

    monkeypatch.setattr(match_pkg, "match_jobs", fake_match)
    result = _invoke("match", "--config", str(cfg))
    assert result.exit_code == 0
    assert len(seen) == 1 and isinstance(seen[0], MarkdownVaultStore)


def test_write_native_uses_sqlite_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, record_close: list[str]) -> None:
    """Test that write uses SQLite store when storage_backend is native."""
    cfg = _write_config(tmp_path, "native")
    seen: list[Any] = []

    def fake_write(config: Any, store: Any) -> dict[str, Any]:
        seen.append(store)
        return {"written": 2, "skipped": 0, "capped": 0, "failed": 0, "errors": []}

    monkeypatch.setattr(write_pkg, "write_letters", fake_write)
    result = _invoke("write", "--config", str(cfg))
    assert result.exit_code == 0
    assert "Wrote 2 letters" in result.output
    assert len(seen) == 1 and isinstance(seen[0], SqliteStore)
    assert record_close


def test_write_markdown_uses_vault_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that write uses Markdown vault store when storage_backend is markdown."""
    cfg = _write_config(tmp_path, "markdown")
    seen: list[Any] = []

    def fake_write(config: Any, store: Any) -> dict[str, Any]:
        seen.append(store)
        return {"written": 2, "skipped": 0, "capped": 0, "failed": 0, "errors": []}

    monkeypatch.setattr(write_pkg, "write_letters", fake_write)
    result = _invoke("write", "--config", str(cfg))
    assert result.exit_code == 0
    assert len(seen) == 1 and isinstance(seen[0], MarkdownVaultStore)
