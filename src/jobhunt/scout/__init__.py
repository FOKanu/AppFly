from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.models import Job, Requirements
from jobhunt.policy import apply_crawl_policy
from jobhunt.scout.agentur import fetch_agentur_jobs
from jobhunt.scout.apify import fetch_apify_jobs
from jobhunt.scout.inbox import fetch_inbox_jobs
from jobhunt.scout.rss import fetch_rss_jobs
from jobhunt.vault import Vault


def collect_jobs(config: AppConfig, vault: Vault, requirements: Requirements) -> list[Job]:
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
