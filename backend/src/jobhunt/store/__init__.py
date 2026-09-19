"""Workspace storage backends (native SQLite or markdown vault).

Purpose: Public exports for CLI, API, and pipeline.
Inputs: ``get_store(config)``.
Returns: Store types and helpers.
Does not: Crawl deny-listed hosts.
"""

from jobhunt.store.factory import get_store, init_native_workspace
from jobhunt.store.import_obsidian import import_obsidian_vault
from jobhunt.store.markdown_vault import MarkdownVaultStore
from jobhunt.store.paths import default_data_root, ensure_native_layout
from jobhunt.store.sqlite import SqliteStore
from jobhunt.store.types import DocumentMeta, LetterRecord, RunRecord, WorkspaceReadiness

__all__ = [
    "DocumentMeta",
    "LetterRecord",
    "MarkdownVaultStore",
    "RunRecord",
    "SqliteStore",
    "WorkspaceReadiness",
    "default_data_root",
    "ensure_native_layout",
    "get_store",
    "import_obsidian_vault",
    "init_native_workspace",
]
