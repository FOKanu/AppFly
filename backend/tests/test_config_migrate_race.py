"""config-migrate skips targets that already exist, even when exists() misses them (mc4)."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from jobhunt import config


def _repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "backend").mkdir()
    (repo / "backend" / "pyproject.toml").write_text("[project]\n", encoding="utf-8")
    (repo / "config.yaml").write_text("storage_backend: native\n", encoding="utf-8")
    (repo / ".env").write_text("GEMINI_API_KEY=\n", encoding="utf-8")
    (repo / ".secrets").mkdir()
    (repo / ".secrets" / "gemini").write_text("k", encoding="utf-8")
    return repo


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX O_EXCL + symlink")
def test_dangling_symlink_target_is_skipped_not_raised(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path))
    dest = tmp_path / "dest"
    dest.mkdir()
    link = dest / ".env"
    link.symlink_to(tmp_path / "nowhere" / ".env")
    assert not link.exists()  # dangling: exists() is False, but O_EXCL create fails

    copied = config.migrate_repo_config(dest)

    assert sorted(copied) == [".secrets/gemini", "config.yaml"]
    assert link.is_symlink()
    assert not (tmp_path / "nowhere").exists()
    assert (dest / "config.yaml").read_text(encoding="utf-8") == "storage_backend: native\n"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX O_EXCL + symlink")
def test_second_run_after_skip_still_copies_nothing_new(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path))
    dest = tmp_path / "dest"
    dest.mkdir()
    (dest / ".env").symlink_to(tmp_path / "nowhere" / ".env")
    config.migrate_repo_config(dest)
    assert config.migrate_repo_config(dest) == []
