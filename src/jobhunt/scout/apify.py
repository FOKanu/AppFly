from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.models import Job
from jobhunt.policy import assert_crawl_allowed


def fetch_apify_jobs(config: AppConfig) -> list[Job]:
    """Validate start URLs against the deny-list. Does not run an actor yet."""
    apify = config.sources.apify
    if not apify.enabled:
        return []
    for url in apify.start_urls:
        assert_crawl_allowed(url, source="apify")
    # Crawler not implemented; refusing to start is safer than a silent scrape.
    return []
