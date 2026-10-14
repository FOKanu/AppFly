"""Scout orchestrator: collect new jobs from allowed sources.

Purpose: Deduplicate listings from Agentur, inbox, RSS, and Apify.
Inputs: App config, vault (existing source ids), requirements (skip companies).
Returns: Fresh ``Job`` objects that are not already in the vault.
Does not: HTTP-fetch deny-listed hosts; skip-company filtering is local only.
"""

from __future__ import annotations

from jobhunt.config import AppConfig
from jobhunt.features.scout.agentur import fetch_agentur_jobs
from jobhunt.features.scout.apify import fetch_apify_jobs
from jobhunt.features.scout.inbox import fetch_inbox_jobs
from jobhunt.features.scout.rss import fetch_rss_jobs
from jobhunt.models import Job, Requirements
from jobhunt.policy import CrawlDeniedError, apply_crawl_policy, hostname
from jobhunt.vault import Vault


def collect_jobs(config: AppConfig, vault: Vault, requirements: Requirements, *, errors: list[str] | None = None) -> list[Job]:
    """Gather new jobs from every enabled source.

    Purpose: One entry point for ``jobhunt scout`` / ``jobhunt run``.
    Inputs: ``config`` (which sources are on), ``vault`` (seen ids), ``requirements`` (skip list).
    Returns: Jobs with unique ``source_id`` not already stored, crawl flags applied.
    Does not: Write notes, score jobs, or fetch a deny-listed listing URL.
    """

    def _gather(label: str, fetch, errors: list[str] | None) -> list[Job]:
        """Helper to gather jobs from a source with error isolation."""
        try:
            return fetch()
        except CrawlDeniedError:
            # CrawlDeniedError is never isolated - always re-raise
            raise
        except Exception as exc:
            if errors is not None:
                # Record the error and continue
                msg = str(exc)[:200]  # Truncate long messages
                errors.append(f"{label}: {type(exc).__name__}: {msg}")
                return []
            else:
                # Re-raise when no error collection is requested
                raise

    seen = vault.existing_source_ids()
    skip = {name.casefold() for name in requirements.skip_companies}
    collected: list[Job] = []

    if config.sources.agentur:
        collected.extend(_gather("agentur", lambda: fetch_agentur_jobs(config), errors))
    if config.sources.inbox:
        collected.extend(_gather("inbox", lambda: fetch_inbox_jobs(vault.inbox_dir), errors))
    for url in config.sources.rss:
        label = f"rss {hostname(url)}"
        collected.extend(_gather(label, lambda u=url: fetch_rss_jobs(u), errors))
    collected.extend(_gather("apify", lambda: fetch_apify_jobs(config), errors))

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
