"""Compatibility package. Canonical code: jobhunt.features.scout.

Purpose: Keep `from jobhunt.scout import collect_jobs` working after the move.
Inputs: Re-exports from jobhunt.features.scout.
Returns: collect_jobs and source fetchers.
Does not: Add scout logic (edit features/scout instead).
"""

from jobhunt.features.scout import collect_jobs
from jobhunt.features.scout.agentur import fetch_agentur_jobs
from jobhunt.features.scout.apify import fetch_apify_jobs
from jobhunt.features.scout.inbox import fetch_inbox_jobs
from jobhunt.features.scout.rss import fetch_rss_jobs

__all__ = [
    "collect_jobs",
    "fetch_agentur_jobs",
    "fetch_apify_jobs",
    "fetch_inbox_jobs",
    "fetch_rss_jobs",
]
