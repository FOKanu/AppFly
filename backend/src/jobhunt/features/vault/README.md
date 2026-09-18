# Vault

Purpose: All Obsidian vault I/O (job notes, companies, letters, Home.md, inbox dir). Python only — the React app must not read the vault.

## Main files

- `__init__.py` — `Vault`, `init_workspace`, `safe_filename`

Compatibility imports: `jobhunt.vault`.

## How to extend

Add methods on `Vault` for new note types. Do not fetch listing URLs from here. Tests: `backend/tests/test_vault.py`.
