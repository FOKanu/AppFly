"""Tests for the .secrets directory resolution (mc3)."""

from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

import pytest

from jobhunt import config
from jobhunt.features.secrets import keychain


def _repo(tmp_path: Path, checkout: bool) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    if checkout:
        (repo / "backend").mkdir()
        (repo / "backend" / "pyproject.toml").write_text("[project]\n", encoding="utf-8")
    return repo


def test_config_dir_secrets_without_legacy(tmp_path, monkeypatch):
    repo = _repo(tmp_path, checkout=True)
    cfg = tmp_path / "cfg"
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(cfg))
    assert keychain.default_secrets_dir() == cfg.resolve() / ".secrets"


def test_legacy_repo_secrets_kept(tmp_path, monkeypatch):
    repo = _repo(tmp_path, checkout=True)
    (repo / ".secrets").mkdir()
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(tmp_path / "cfg"))
    assert keychain.default_secrets_dir() == repo / ".secrets"


def test_env_override_wins(tmp_path, monkeypatch):
    repo = _repo(tmp_path, checkout=True)
    (repo / ".secrets").mkdir()
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(tmp_path / "cfg"))
    monkeypatch.setenv("JOBHUNT_SECRETS_DIR", str(tmp_path / "forced"))
    kc = keychain.default_keychain()
    assert isinstance(kc, keychain.FileKeychain)
    assert kc.root == tmp_path / "forced"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX file modes")
def test_file_keychain_round_trip_in_config_dir(tmp_path, monkeypatch):
    repo = _repo(tmp_path, checkout=False)
    cfg = tmp_path / "cfg"
    monkeypatch.setattr(config, "REPO_ROOT", repo)
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(cfg))
    monkeypatch.delenv("JOBHUNT_SECRETS_DIR", raising=False)
    monkeypatch.setattr(keychain, "os_keychain_available", lambda: False)
    kc = keychain.default_keychain()
    assert isinstance(kc, keychain.FileKeychain)
    assert kc.root == cfg.resolve() / ".secrets"
    kc.set_password("gemini", "k-123")
    assert kc.get_password("gemini") == "k-123"
    files = [p for p in kc.root.rglob("*") if p.is_file()]
    assert files
    for f in files:
        assert stat.S_IMODE(os.stat(f).st_mode) == 0o600
