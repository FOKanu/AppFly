"""Tests for `jobhunt init` in the config dir and `jobhunt config-migrate` (mc2)."""

from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

import pytest
from typer.testing import CliRunner

from jobhunt import cli, config
from jobhunt.cli import app


def _fake_repo(tmp_path: Path, checkout: bool = True) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    if checkout:
        (repo / "backend").mkdir()
        (repo / "backend" / "pyproject.toml").write_text("[project]\n", encoding="utf-8")
    (repo / "config.yaml").write_text("storage_backend: native\n", encoding="utf-8")
    (repo / ".env").write_text("GEMINI_API_KEY=x\n", encoding="utf-8")
    (repo / ".secrets").mkdir()
    (repo / ".secrets" / "gemini").write_text("k", encoding="utf-8")
    return repo


def test_init_writes_into_config_dir_not_repo(tmp_path, monkeypatch):
    cfg = tmp_path / "cfg"
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(cfg))
    monkeypatch.setenv("APPFLY_DATA_DIR", str(tmp_path / "data"))
    # Keep the legacy default (base code) away from the real repo.
    monkeypatch.setattr(cli, "DEFAULT_CONFIG_PATH", tmp_path / "legacy" / "config.yaml", raising=False)
    (tmp_path / "legacy").mkdir()
    repo_cfg = config.REPO_ROOT / "config.yaml"
    repo_env = config.REPO_ROOT / ".env"
    before = (repo_cfg.exists(), repo_env.exists())
    result = CliRunner().invoke(app, ["init"])
    assert result.exit_code == 0, result.output
    assert (cfg.resolve() / "config.yaml").is_file()
    assert (cfg.resolve() / ".env").is_file()
    assert (repo_cfg.exists(), repo_env.exists()) == before
    if sys.platform != "win32":
        assert stat.S_IMODE(os.stat(cfg.resolve() / ".env").st_mode) == 0o600


def test_migrate_copies_all_never_overwrites_idempotent(tmp_path, monkeypatch):
    repo = _fake_repo(tmp_path)
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    dest = tmp_path / "dest"
    dest.mkdir()
    (dest / ".env").write_text("KEEP=1\n", encoding="utf-8")
    copied = config.migrate_repo_config(dest)
    assert sorted(copied) == [".secrets/gemini", "config.yaml"]
    assert (dest / ".env").read_text(encoding="utf-8") == "KEEP=1\n"
    assert (dest / "config.yaml").read_text(encoding="utf-8") == "storage_backend: native\n"
    assert (dest / ".secrets" / "gemini").read_text(encoding="utf-8") == "k"
    assert (repo / "config.yaml").is_file()
    assert config.migrate_repo_config(dest) == []


def test_migrate_copies_env_too(tmp_path, monkeypatch):
    repo = _fake_repo(tmp_path)
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    copied = config.migrate_repo_config(tmp_path / "fresh")
    assert sorted(copied) == [".env", ".secrets/gemini", "config.yaml"]


def test_migrate_from_non_checkout_is_noop(tmp_path, monkeypatch):
    repo = _fake_repo(tmp_path, checkout=False)
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    assert config.migrate_repo_config(tmp_path / "fresh") == []


def test_config_migrate_command(tmp_path, monkeypatch):
    repo = _fake_repo(tmp_path)
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(tmp_path / "cfg"))
    result = CliRunner().invoke(app, ["config-migrate"])
    assert result.exit_code == 0, result.output
    assert "Copied 3 files to" in result.output
    assert "repo config keeps winning" in result.output
