from __future__ import annotations

import sys
from pathlib import Path

import pytest

from jobhunt import config


def _repo(tmp_path: Path, checkout: bool) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    if checkout:
        (repo / "backend").mkdir()
        (repo / "backend" / "pyproject.toml").write_text("[project]\n", encoding="utf-8")
    (repo / "config.yaml").write_text("storage_backend: native\n", encoding="utf-8")
    (repo / ".env").write_text("GEMINI_API_KEY=\n", encoding="utf-8")
    (repo / ".secrets").mkdir()
    (repo / ".secrets" / "gemini").write_text("k", encoding="utf-8")
    return repo


def test_existing_env_file_is_skipped_and_untouched(tmp_path, monkeypatch):
    """Test that config-migrate skips an existing .env file without touching it."""
    dest = tmp_path / "dest"
    dest.mkdir()
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=True))

    # Write a file to the destination .env
    (dest / ".env").write_text("KEEP=1\n", encoding="utf-8")

    copied = config.migrate_repo_config(dest)

    # The .env should not be in the copied list
    assert ".env" not in copied

    # The content should remain untouched
    assert (dest / ".env").read_text(encoding="utf-8") == "KEEP=1\n"

    # Other files like config.yaml should still be copied
    assert "config.yaml" in copied


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX symlinks")
def test_dangling_env_symlink_is_skipped_without_error(tmp_path, monkeypatch):
    """Test that config-migrate skips a dangling .env symlink without error."""
    dest = tmp_path / "dest"
    dest.mkdir()
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=True))

    # Create a dangling symlink at the destination .env
    (dest / ".env").symlink_to(tmp_path / "elsewhere")

    copied = config.migrate_repo_config(dest)

    # The .env should not be in the copied list
    assert ".env" not in copied

    # The destination should still be a symlink
    assert (dest / ".env").is_symlink()

    # The target of the symlink should not exist
    assert not (tmp_path / "elsewhere").exists()
