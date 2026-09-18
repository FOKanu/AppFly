"""Crawl deny-list. Inbox may store forbidden URLs; nothing may HTTP-fetch them.

Purpose: Block LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, Wellfound, and AngelList crawls.
Inputs: URLs and optional Job objects.
Returns: Booleans, annotated jobs, or CrawlDeniedError.
Does not: Perform HTTP, start Apify, or delete inbox clips.
"""

from __future__ import annotations

from urllib.parse import urlparse

# Registrable roots that forbid automated access. Subdomains match too
# (jobs.linkedin.com, de.indeed.com). Never fetch, crawl, or send these to Apify.
# Inbox clips may *store* a URL you already opened; they must not trigger an HTTP GET.
DENIED_ROOT_DOMAINS: frozenset[str] = frozenset(
    {
        "linkedin.com",
        "indeed.com",
        "stepstone.de",
        "stepstone.com",
        "ziprecruiter.com",
        "xing.com",
        "glassdoor.com",
        "glassdoor.de",
        "wellfound.com",
        "angel.co",
    }
)
DENIED_CRAWL_HOSTS = DENIED_ROOT_DOMAINS


class CrawlDeniedError(ValueError):
    """Raised when a URL would be crawled, scraped, or sent to Apify against policy.

    Purpose: Fail a scout run instead of silently skipping a denied fetch.
    Inputs: Error message from assert_crawl_allowed.
    Returns: Exception instance.
    Does not: Suggest workarounds that bypass the deny-list.
    """


def hostname(url: str) -> str:
    """Extract a lowercase hostname from a URL.

    Purpose: Normalize hosts before deny-list checks.
    Inputs: URL string (may be empty).
    Returns: Hostname or empty string.
    Does not: Fetch the URL.
    """
    if not url or not url.strip():
        return ""
    parsed = urlparse(url.strip())
    return (parsed.hostname or "").casefold()


def _normalized_host(url: str) -> str:
    host = hostname(url)
    if host.startswith("www."):
        return host[4:]
    return host


def is_denied_host(url: str) -> bool:
    """Whether this URL's host is on DENIED_CRAWL_HOSTS (including subdomains).

    Purpose: Cheap check used by apply_crawl_policy and assert_crawl_allowed.
    Inputs: URL string.
    Returns: True if crawling is forbidden.
    Does not: Fetch or mutate the job.
    """
    host = _normalized_host(url)
    if not host:
        return False
    return any(host == root or host.endswith(f".{root}") for root in DENIED_ROOT_DOMAINS)


def assert_crawl_allowed(url: str, *, source: str = "crawl") -> None:
    """Call before any HTTP fetch, RSS pull, or Apify actor start_url.

    Purpose: Fail closed when a source would touch a deny-listed host.
    Inputs: URL and a short source label (rss, apify, crawl).
    Returns: None when allowed.
    Does not: Skip the URL silently or fetch it.
    """
    if is_denied_host(url):
        host = hostname(url)
        raise CrawlDeniedError(
            f"{source} refused {host}: this host forbids scraping. "
            "Clip the listing into _inbox/ yourself instead. "
            "Do not pass cookies or session tokens for this site."
        )


def apply_crawl_policy(job: object) -> object:
    """Mark jobs whose listing URL must never be fetched by Apify or httpx.

    Purpose: Store crawl_allowed=false on inbox clips that point at job boards.
    Inputs: Object with url, crawl_allowed, and optional extra dict.
    Returns: The same object, annotated.
    Does not: HTTP-GET the listing or remove the note.
    """
    url = str(getattr(job, "url", "") or "")
    denied = is_denied_host(url)
    setattr(job, "crawl_allowed", not denied)
    extra = getattr(job, "extra", None)
    if isinstance(extra, dict):
        extra["crawl_allowed"] = not denied
        if denied:
            extra["crawl_block_reason"] = f"denied-host:{hostname(url)}"
    return job
