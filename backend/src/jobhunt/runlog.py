"""Compatibility shim. Canonical package: jobhunt.features.runlog.

Purpose: Keep `from jobhunt.runlog import format_run_note` working.
Inputs: None (re-export).
Returns: format_run_note.
Does not: Format logs itself (edit features/runlog).
"""

from jobhunt.features.runlog import format_run_note

__all__ = ["format_run_note"]
