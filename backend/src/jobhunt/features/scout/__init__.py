"""Scout: collect jobs from allowed sources only.

Purpose: Fan in Arbeitsagentur, vault inbox, RSS, and the Apify URL check.
Inputs: AppConfig, Vault, Requirements.
Returns: New Job records not already stored.
Does not: Write vault notes, HTTP-fetch deny-listed hosts, or start Apify actors.
"""

from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.features.scout.agentur import fetch_agentur_jobs
from jobhunt.features.scout.apify import fetch_apify_jobs
from jobhunt.features.scout.inbox import fetch_inbox_jobs
from jobhunt.features.scout.rss import fetch_rss_jobs
from jobhunt.features.vault import Vault
from jobhunt.models import Job, Requirements
from jobhunt.policy import apply_crawl_policy


def collect_jobs(config: AppConfig, vault: Vault, requirements: Requirements) -> list[Job]:
    """Run enabled sources and drop duplicates plus skip-list companies.

    Purpose: Single entry used by `jobhunt scout` and `jobhunt run`.
    Inputs: Config (source flags), vault (existing ids, inbox dir), skip_companies.
    Returns: Jobs whose source_id is not already in the vault.
    Does not: Call vault.upsert_job or fetch listing URLs on DENIED_CRAWL_HOSTS.
    """
    seen = vault.existing_source_ids()
    skip = {name.casefold() for name in requirements.skip_companies}
    collected: list[Job] = []

    if config.sources.agentur:
        collected.extend(fetch_agentur_jobs(config))
    if config.sources.inbox:
        collected.extend(fetch_inbox_jobs(vault.inbox_dir))
    for url in config.sources.rss:
        collected.extend(fetch_rss_jobs(url))
    collected.extend(fetch_apify_jobs(config))

    fresh: list[Job] = []
    used_ids = set(seen)
    for job in collected:
        apply_crawl_policy(job)
        if not job.source_id or job.source_id in used_ids:
            continue
        if job.company.casefold() in skip:
            continue
        used_ids.add(job.source_id)
        fresh.append(job)
    return fresh
