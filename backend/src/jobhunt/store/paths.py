"""App data directory paths for the native store.

Purpose: Resolve OS-specific Application Support / XDG paths.
Inputs: Optional override via APPFLY_DATA_DIR.
Returns: Root and child paths (sqlite, files/, imports/).
Does not: Create directories until ``ensure_native_layout`` is called.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


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


def ensure_native_layout(root: Path | None = None) -> Path:
    """Create sqlite parent, files/, and imports/ under the data root.

    Purpose: First-run / init for NativeStore.
    Inputs: Optional root; default from ``default_data_root``.
    Returns: The root path.
    Does not: Open SQLite or copy Obsidian notes.
    """

    base = root or default_data_root()
    (base / "files" / "documents").mkdir(parents=True, exist_ok=True)
    (base / "files" / "letters").mkdir(parents=True, exist_ok=True)
    (base / "files" / "inbox").mkdir(parents=True, exist_ok=True)
    (base / "imports").mkdir(parents=True, exist_ok=True)
    return base


def sqlite_path(root: Path | None = None) -> Path:
    """Path to ``appfly.sqlite`` under the data root."""

    return (root or default_data_root()) / "appfly.sqlite"
