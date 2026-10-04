"""App data directory paths for the native store.

Purpose: Resolve OS-specific Application Support / XDG paths.
Inputs: Optional override via APPFLY_DATA_DIR.
Returns: Root and child paths (sqlite, files/, imports/, cache/).
Does not: Create directories until ``ensure_native_layout`` is called.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

# Repo root is parent of backend/ (paths.py → store → jobhunt → src → backend → repo).
_REPO_ROOT = Path(__file__).resolve().parents[4]
_LEGACY_EMBEDDINGS = _REPO_ROOT / ".cache" / "embeddings"
_MIGRATE_MARKER = ".migrated_from_repo_cache"


def default_data_root() -> Path:
    """Return the default AppFly data directory for this OS.

    Purpose: Native store root without requiring Obsidian.
    Inputs: ``APPFLY_DATA_DIR`` env override when set.
    Returns: Expanded path (may not exist yet).
    Does not: Create the directory.
    """

    override = os.environ.get("APPFLY_DATA_DIR", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == "darwin":
        return (Path.home() / "Library" / "Application Support" / "AppFly").resolve()
    xdg = os.environ.get("XDG_DATA_HOME", "").strip()
    if xdg:
        return (Path(xdg) / "appfly").resolve()
    return (Path.home() / ".local" / "share" / "appfly").resolve()


def maybe_migrate_legacy_embeddings_cache(dest_cache_root: Path) -> int:
    """One-shot copy of repo ``.cache/embeddings`` into app-data cache.

    Purpose: M4 — keep prior embedding vectors when switching off repo-root cache.
    Inputs: Destination cache root (``…/cache``); embeddings land in ``…/cache/embeddings``.
    Returns: Number of ``*.json`` files newly copied (0 if nothing to do).
    Does not: Overwrite existing dest files, delete the legacy tree, or copy secrets.
    """

    dest = dest_cache_root / "embeddings"
    dest.mkdir(parents=True, exist_ok=True)
    marker = dest / _MIGRATE_MARKER
    if marker.exists():
        return 0
    if not _LEGACY_EMBEDDINGS.is_dir():
        marker.write_text("no-legacy-source\n", encoding="utf-8")
        return 0
    copied = 0
    for src in _LEGACY_EMBEDDINGS.glob("*.json"):
        target = dest / src.name
        if target.exists():
            continue
        shutil.copy2(src, target)
        copied += 1
    marker.write_text(f"copied={copied}\n", encoding="utf-8")
    return copied


def ensure_native_layout(root: Path | None = None) -> Path:
    """Create sqlite parent, files/, imports/, and cache/embeddings under the data root.

    Purpose: First-run / init for NativeStore (M4 includes embeddings cache).
    Inputs: Optional root; default from ``default_data_root``.
    Returns: The root path.
    Does not: Open SQLite or copy Obsidian notes (embedding migrate is separate, best-effort).
    """

    base = root or default_data_root()
    (base / "files" / "documents").mkdir(parents=True, exist_ok=True)
    (base / "files" / "letters").mkdir(parents=True, exist_ok=True)
    (base / "files" / "inbox").mkdir(parents=True, exist_ok=True)
    (base / "imports").mkdir(parents=True, exist_ok=True)
    (base / "cache" / "embeddings").mkdir(parents=True, exist_ok=True)
    maybe_migrate_legacy_embeddings_cache(base / "cache")
    return base


def sqlite_path(root: Path | None = None) -> Path:
    """Path to ``appfly.sqlite`` under the data root."""

    return (root or default_data_root()) / "appfly.sqlite"
