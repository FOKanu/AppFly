"""Compatibility shim. Canonical module: jobhunt.features.scout.rss.

Purpose: Keep `jobhunt.scout.rss` importable.
Inputs: None (re-export).
Returns: fetch_rss_jobs.
Does not: Fetch feeds (edit features/scout/rss.py).
"""

from jobhunt.features.scout.rss import fetch_rss_jobs

__all__ = ["fetch_rss_jobs"]
