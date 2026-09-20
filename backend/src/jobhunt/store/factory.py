"""Store factory.

Purpose: Select Markdown or SQLite backend from AppConfig.
Inputs: Loaded ``AppConfig``.
Returns: An AppStore instance.
Does not: Migrate data between backends.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from jobhunt.store.markdown_vault import MarkdownVaultStore
from jobhunt.store.paths import default_data_root, ensure_native_layout
from jobhunt.store.sqlite import SqliteStore

if TYPE_CHECKING:
    from jobhunt.config import AppConfig
    from jobhunt.store.protocol import AppStore


def get_store(config: AppConfig) -> AppStore:
    """Build the workspace store for this config.

    Purpose: Single entry for CLI, pipeline, and API.
    Inputs: ``AppConfig.storage_backend`` and paths.
    Returns: ``SqliteStore`` or ``MarkdownVaultStore``.
    Does not: Import Obsidian notes.
    """

    backend = (getattr(config, "storage_backend", None) or "native").strip().lower()
    if backend == "markdown":
        return MarkdownVaultStore(config.vault)
    root = config.native_data_path
    ensure_native_layout(root)
    return SqliteStore(root)


def init_native_workspace(config: AppConfig) -> SqliteStore:
    """Create native data dir + empty SQLite store.

    Purpose: ``jobhunt init --native`` / ``POST /workspace/init``.
    Inputs: AppConfig (uses native_data_path).
    Returns: Open ``SqliteStore``.
    Does not: Touch an Obsidian vault.
    """

    root = ensure_native_layout(config.native_data_path or default_data_root())
    store = SqliteStore(root)
    store.ensure_dirs()
    store.regenerate_home(last_run="init")
    return store
