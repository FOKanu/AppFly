"""Apify start-URL guard (actor not implemented yet).

Purpose: Reject deny-listed start URLs before any future public-page actor.
Inputs: ``AppConfig.sources.apify``.
Returns: Empty job list; enabled+denied raises ``CrawlDeniedError``.
Does not: Run an actor, upload cookies, or scrape job boards.
"""

from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.models import Job
from jobhunt.policy import assert_crawl_allowed


def fetch_apify_jobs(config: AppConfig) -> list[Job]:
    """Validate start URLs against the deny-list. Does not run an actor yet.

    Purpose: Fail the run if Apify would be pointed at a forbidden host.
    Inputs: Config with ``apify.enabled`` and ``start_urls``.
    Returns: ``[]`` when disabled or when URLs are allowed (crawler TBD).
    Does not: Start a scrape or skip a denied URL silently.
    """

    apify = config.sources.apify
    if not apify.enabled:
        return []
    for url in apify.start_urls:
        assert_crawl_allowed(url, source="apify")
    # Crawler not implemented; refusing to start is safer than a silent scrape.
    return []
