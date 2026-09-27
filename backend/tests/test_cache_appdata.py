"""M4: embeddings cache under native app-data."""

from __future__ import annotations

from pathlib import Path

from jobhunt.config import REPO_ROOT, AppConfig
from jobhunt.store.paths import ensure_native_layout, maybe_migrate_legacy_embeddings_cache


def test_native_cache_dir_under_app_data(tmp_path: Path) -> None:
    cfg = AppConfig(
        vault_path=tmp_path / "vault",
        storage_backend="native",
        native_data_dir=tmp_path / "data",
        config_path=tmp_path / "c.yaml",
    )
    assert cfg.cache_dir == (tmp_path / "data").resolve() / "cache"
    assert cfg.cache_dir / "embeddings" == cfg.cache_dir / "embeddings"


def test_markdown_cache_dir_is_repo_dot_cache(tmp_path: Path) -> None:
    cfg = AppConfig(
        vault_path=tmp_path / "vault",
        storage_backend="markdown",
        config_path=tmp_path / "c.yaml",
    )
    assert cfg.cache_dir == REPO_ROOT / ".cache"


def test_ensure_native_layout_creates_cache_embeddings(tmp_path: Path) -> None:
    root = ensure_native_layout(tmp_path / "appfly")
    assert (root / "cache" / "embeddings").is_dir()


def test_migrate_copies_legacy_json_once(tmp_path: Path, monkeypatch) -> None:
    legacy = tmp_path / "repo" / ".cache" / "embeddings"
    legacy.mkdir(parents=True)
    (legacy / "abc.json").write_text("[0.1, 0.2]", encoding="utf-8")

    import jobhunt.store.paths as paths_mod

    monkeypatch.setattr(paths_mod, "_LEGACY_EMBEDDINGS", legacy)
    dest_cache = tmp_path / "data" / "cache"
    n = maybe_migrate_legacy_embeddings_cache(dest_cache)
    assert n == 1
    assert (dest_cache / "embeddings" / "abc.json").read_text(encoding="utf-8") == "[0.1, 0.2]"
    assert (dest_cache / "embeddings" / ".migrated_from_repo_cache").is_file()
    assert maybe_migrate_legacy_embeddings_cache(dest_cache) == 0
