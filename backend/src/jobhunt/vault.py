"""Compatibility shim. Canonical package: jobhunt.features.vault.

Purpose: Keep `from jobhunt.vault import Vault` working.
Inputs: None (re-export).
Returns: Vault, init_workspace, safe_filename, VAULT_FOLDERS.
Does not: Read or write notes (edit features/vault).
"""

from jobhunt.features.vault import VAULT_FOLDERS, Vault, init_workspace, safe_filename

__all__ = ["VAULT_FOLDERS", "Vault", "init_workspace", "safe_filename"]
