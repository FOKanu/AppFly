"""Crawl deny-list for job boards that forbid automated access.

Purpose: Canonical host policy used before HTTP, RSS, or Apify fetches.
Inputs: Listing or feed URLs as strings.
Returns: Allow/deny helpers and ``CrawlDeniedError``.
Does not: Fetch URLs; inbox may *store* a denied URL without calling these fetch guards.
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

    Purpose: Fail the run instead of skipping a denied URL silently.
    Inputs: Error message naming the source (rss, apify, crawl) and host.
    Returns: Exception to be caught by the CLI.
    Does not: Suggest a bypass or cookie upload.
    """


def hostname(url: str) -> str:
    """Return the URL hostname, lowercased.

    Purpose: Shared host extraction for deny checks.
    Inputs: Any URL string (may be empty).
    Returns: Hostname or ``\"\"``.
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
    """True when the URL's host is a deny-listed job board (including subdomains).

    Purpose: Predicate for vault flags and tests.
    Inputs: Listing or feed URL.
    Returns: ``True`` if crawls are forbidden.
    Does not: Fetch the URL or mutate the job.
    """

    host = _normalized_host(url)
    if not host:
        return False
    return any(host == root or host.endswith(f".{root}") for root in DENIED_ROOT_DOMAINS)


def assert_crawl_allowed(url: str, *, source: str = "crawl") -> None:
    """Call before any HTTP fetch, RSS pull, or Apify actor start_url.

    Purpose: Hard stop for automated access to forbidden hosts.
    Inputs: URL plus a short ``source`` label for the error text.
    Returns: None when allowed.
    Does not: Skip silently; raises ``CrawlDeniedError`` when denied.
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

    Purpose: Inbox may store a LinkedIn/Indeed URL; this flags it ``crawl_allowed=False``.
    Inputs: A ``Job``-like object with ``url`` and optional ``extra`` dict.
    Returns: The same object, mutated with crawl flags.
    Does not: HTTP-GET the listing URL.
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
