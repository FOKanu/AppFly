"""Python engine for Jobhunt Copilot.

Purpose: Scout allowed sources, match the CV, draft letters, write an Obsidian vault.
Install: `pip install -e "./backend[dev]"` from the repo root (or `pip install -e ".[dev]"` here).
Tests: `pytest` from this directory, or `make test-backend` from the repo root.
Does not: Render React UI or HTTP-fetch deny-listed job boards.
"""

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for the split and how to add a scout source.
