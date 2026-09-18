"""RSS ingest for feeds that are not on the crawl deny-list.

Purpose: Parse a feed URL into ``Job`` rows after a policy check.
Inputs: Feed URL string.
Returns: Jobs with source ``rss``.
Does not: Fetch deny-listed feed hosts; does not GET each listing page.
"""

from __future__ import annotations

import hashlib

import feedparser

from jobhunt.models import Job
from jobhunt.policy import assert_crawl_allowed


def fetch_rss_jobs(url: str) -> list[Job]:
    """Parse one RSS/Atom feed.

    Purpose: Optional scout source from ``config.sources.rss``.
    Inputs: Feed URL (checked with ``assert_crawl_allowed`` first).
    Returns: Jobs built from feed entries.
    Does not: Follow entry links or accept LinkedIn/Indeed feed URLs.
    """

    assert_crawl_allowed(url, source="rss")
    parsed = feedparser.parse(url)
    jobs: list[Job] = []
    for entry in parsed.entries:
        title = _attr(entry, "title") or "Untitled"
        link = _attr(entry, "link")
        summary = _attr(entry, "summary") or _attr(entry, "description")
        company = _attr(entry, "author") or _company_from_feed(parsed, entry)
        source_id = _attr(entry, "id") or link or _hash_id(url, title)
        jobs.append(
            Job(
                source_id=str(source_id),
                source="rss",
                title=title,
                company=company or "Unknown",
                url=link,
                description=_strip(summary),
            )
        )
    return jobs


def _attr(entry: object, name: str) -> str:
    value = getattr(entry, name, "")
    return str(value).strip() if value else ""


def _company_from_feed(parsed: object, entry: object) -> str:
    feed = getattr(parsed, "feed", None)
    if feed is not None:
        title = getattr(feed, "title", "")
        if title:
            return str(title)
    return ""


def _hash_id(*parts: str) -> str:
    blob = "|".join(parts)
    return hashlib.sha1(blob.encode("utf-8")).hexdigest()[:16]


def _strip(text: str) -> str:
    import re

    return " ".join(re.sub(r"<[^>]+>", " ", text).split())
