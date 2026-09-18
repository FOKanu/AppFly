"""Compatibility shim. Canonical module: jobhunt.features.scout.agentur.

Purpose: Keep `jobhunt.scout.agentur` importable.
Inputs: None (re-export).
Returns: fetch_agentur_jobs.
Does not: Implement Jobsuche calls (edit features/scout/agentur.py).
"""

from jobhunt.features.scout.agentur import fetch_agentur_jobs

__all__ = ["fetch_agentur_jobs"]
