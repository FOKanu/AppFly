"""Compatibility shim. Canonical module: jobhunt.features.scout.inbox.

Purpose: Keep `jobhunt.scout.inbox` importable.
Inputs: None (re-export).
Returns: fetch_inbox_jobs.
Does not: Parse clips (edit features/scout/inbox.py).
"""

from jobhunt.features.scout.inbox import fetch_inbox_jobs

__all__ = ["fetch_inbox_jobs"]
