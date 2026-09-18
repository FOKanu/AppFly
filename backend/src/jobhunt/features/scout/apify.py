"""Apify start-URL gate. Actors must not target deny-listed job boards.

Purpose: Reject LinkedIn/Indeed/Stepstone/… URLs before any actor run.
Inputs: AppConfig.sources.apify (enabled flag and start_urls).
Returns: [] today; raises CrawlDeniedError if a start URL is denied.
Does not: Start an actor, upload cookies, or skip a denied URL silently.
"""

from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.models import Job
from jobhunt.policy import assert_crawl_allowed


def fetch_apify_jobs(config: AppConfig) -> list[Job]:
    """Validate start URLs against the deny-list. Does not run an actor yet.

    Purpose: Fail the run when Apify would be pointed at a forbidden host.
    Inputs: AppConfig with sources.apify.
    Returns: Empty list when disabled or when URLs are allowed (crawler TBD).
    Does not: Scrape job boards or bypass login walls.
    """
    apify = config.sources.apify
    if not apify.enabled:
        return []
    for url in apify.start_urls:
        assert_crawl_allowed(url, source="apify")
    # Crawler not implemented; refusing to start is safer than a silent scrape.
    return []
