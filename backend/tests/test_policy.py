import pytest

from jobhunt.config import ApifyConfig, AppConfig, SourcesConfig
from jobhunt.models import Job
from jobhunt.policy import (
    CrawlDeniedError,
    apply_crawl_policy,
    assert_crawl_allowed,
    is_denied_host,
)
from jobhunt.scout.apify import fetch_apify_jobs
from jobhunt.scout.rss import fetch_rss_jobs


@pytest.mark.parametrize(
    "url",
    [
        "https://www.linkedin.com/jobs/view/123",
        "https://linkedin.com/jobs/view/123",
        "https://de.indeed.com/viewjob?jk=abc",
        "https://www.stepstone.de/stellenangebote--foo",
        "https://www.ziprecruiter.com/jobs/foo",
        "https://www.xing.com/jobs/foo",
        "https://www.glassdoor.de/Job/foo",
        "https://jobs.linkedin.com/jobs/view/1",
    ],
)
def test_denied_job_boards(url: str) -> None:
    assert is_denied_host(url) is True
    with pytest.raises(CrawlDeniedError):
        assert_crawl_allowed(url, source="apify")


def test_company_career_page_is_allowed() -> None:
    url = "https://careers.example.com/jobs/python"
    assert is_denied_host(url) is False
    assert_crawl_allowed(url, source="apify")


def test_inbox_may_store_denied_url_but_not_crawl() -> None:
    job = Job(
        source_id="clip-1",
        source="inbox",
        title="Role",
        company="Acme",
        url="https://www.linkedin.com/jobs/view/99",
    )
    apply_crawl_policy(job)
    assert job.crawl_allowed is False
    assert job.extra["crawl_block_reason"].startswith("denied-host:")


def test_rss_refuses_denied_feed_url() -> None:
    with pytest.raises(CrawlDeniedError):
        fetch_rss_jobs("https://www.linkedin.com/jobs/feed")


def test_apify_refuses_denied_start_url() -> None:
    cfg = AppConfig(
        sources=SourcesConfig(
            agentur=False,
            inbox=False,
            apify=ApifyConfig(
                enabled=True,
                start_urls=["https://www.indeed.com/jobs?q=python"],
            ),
        )
    )
    with pytest.raises(CrawlDeniedError):
        fetch_apify_jobs(cfg)


def test_apify_disabled_does_not_run() -> None:
    cfg = AppConfig(
        sources=SourcesConfig(
            apify=ApifyConfig(
                enabled=False,
                start_urls=["https://www.linkedin.com/jobs/view/1"],
            )
        )
    )
    assert fetch_apify_jobs(cfg) == []
