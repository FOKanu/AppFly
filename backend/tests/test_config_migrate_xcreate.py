"""Tests for config migration exclusive create behavior."""

import os
import types
from pathlib import Path

from jobhunt import config


def _repo(tmp_path: Path, checkout: bool = True) -> Path:
    """Helper to create a source checkout with config.yaml, .env, and .secrets/gemini."""
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    (repo_root / "config.yaml").write_text("vault_path: /tmp/vault\n")
    (repo_root / ".env").write_text("GEMINI_API_KEY=secret_key\n")
    secrets = repo_root / ".secrets"
    secrets.mkdir()
    (secrets / "gemini").write_text("gemini_key\n")
    if checkout:
        # Mark as a source checkout by creating backend/pyproject.toml
        backend_dir = repo_root / "backend"
        backend_dir.mkdir()
        (backend_dir / "pyproject.toml").write_text("[build-system]\n")
    return repo_root


def test_migrate_skips_dangling_symlink_config_yaml(tmp_path, monkeypatch):
    """Test that migrate_repo_config skips dangling symlinks to config.yaml."""
    # Setup source checkout
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=True))

    dest = tmp_path / "dest"
    dest.mkdir()

    # Create dangling symlink
    elsewhere = tmp_path / "elsewhere.yaml"
    (dest / "config.yaml").symlink_to(elsewhere)

    # Call migrate
    copied = config.migrate_repo_config(dest)

    # Assert behavior
    assert "config.yaml" not in copied
    assert (dest / "config.yaml").is_symlink()
    assert not elsewhere.exists()


def test_migrate_skips_dangling_symlink_env_on_nt(tmp_path, monkeypatch):
    """Test that migrate_repo_config skips dangling symlinks to .env on non-POSIX."""
    # Setup source checkout
    monkeypatch.setattr(config, "REPO_ROOT", _repo(tmp_path, checkout=True))

    # Monkeypatch os to simulate Windows (non-POSIX)
    monkeypatch.setattr(
        config,
        "os",
        types.SimpleNamespace(
            name="nt",
            environ=os.environ,
            chmod=os.chmod,
            open=os.open,
            O_WRONLY=os.O_WRONLY,
            O_CREAT=os.O_CREAT,
            O_EXCL=os.O_EXCL,
            fdopen=os.fdopen,
        ),
    )

    dest = tmp_path / "dest"
    dest.mkdir()

    # Create dangling symlink
    elsewhere = tmp_path / "elsewhere_env"
    (dest / ".env").symlink_to(elsewhere)

    # Call migrate
    copied = config.migrate_repo_config(dest)

    # Assert behavior
    assert ".env" not in copied
    assert "config.yaml" in copied
    assert ".secrets/gemini" in copied
    assert (dest / ".env").is_symlink()
    assert not elsewhere.exists()
