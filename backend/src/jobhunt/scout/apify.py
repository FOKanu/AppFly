"""Compatibility shim. Canonical module: jobhunt.features.scout.apify.

Purpose: Keep `jobhunt.scout.apify` importable.
Inputs: None (re-export).
Returns: fetch_apify_jobs.
Does not: Start Apify actors (edit features/scout/apify.py).
"""

from jobhunt.features.scout.apify import fetch_apify_jobs

__all__ = ["fetch_apify_jobs"]
