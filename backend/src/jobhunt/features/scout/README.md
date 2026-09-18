# Scout

Purpose: Collect jobs from Arbeitsagentur, local `_inbox/` clips, allowed RSS feeds, and the Apify URL gate. Never HTTP-fetch LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, Wellfound, or AngelList.

## Main files

- `__init__.py` — `collect_jobs` (register new sources here)
- `agentur.py` — Jobsuche API client
- `inbox.py` — parse vault `_inbox/` files only
- `rss.py` — RSS after `assert_crawl_allowed`
- `apify.py` — deny-list check; no actor run yet

Compatibility imports: `jobhunt.scout` re-exports this package.

## How to extend

1. Add `backend/src/jobhunt/features/scout/<source>.py` with `fetch_<source>_jobs(...) -> list[Job]`.
2. Call `assert_crawl_allowed(url, source="...")` before any HTTP, RSS, or Apify start URL.
3. Import and call it from `collect_jobs` in `__init__.py`.
4. Add tests under `backend/tests/`.
