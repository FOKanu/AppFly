# Scout

Collects new jobs from the Arbeitsagentur API, optional RSS feeds, local `_inbox/` clips, and a future Apify public-page actor. `collect_jobs` is the only orchestrator; agentur, rss, inbox, and apify stay in their own modules. Crawl policy is applied here, but the deny-list itself lives in `jobhunt.policy`. This package never HTTP-fetches a deny-listed listing URL.
