"""config-migrate never leaves secrets readable by others (mc2f)."""

from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

import pytest
from typer.testing import CliRunner

from jobhunt import config
from jobhunt.cli import app


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


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX file modes")
def test_secrets_dir_and_files_are_private_even_with_open_umask(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=True))
    dest = tmp_path / "dest"
    old = os.umask(0)
    try:
        copied = config.migrate_repo_config(dest)
    finally:
        os.umask(old)
    assert sorted(copied) == [".env", ".secrets/gemini", "config.yaml"]
    assert stat.S_IMODE(os.stat(dest / ".secrets").st_mode) == 0o700
    assert stat.S_IMODE(os.stat(dest / ".secrets" / "gemini").st_mode) == 0o600
    assert stat.S_IMODE(os.stat(dest / ".env").st_mode) == 0o600


def test_command_outside_checkout_says_nothing_to_migrate(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=False))
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(tmp_path / "cfg"))
    result = CliRunner().invoke(app, ["config-migrate"])
    assert result.exit_code == 0, result.output
    assert "nothing to migrate" in result.output
    assert "repo copies" not in result.output
