# Agent notes

- Job listings from LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, and Glassdoor may only enter via the user's `_inbox/` clip. Never crawl those hosts and never send them to Apify.
- Enforcement: `jobhunt.policy` (`DENIED_CRAWL_HOSTS`, `assert_crawl_allowed`).
- Writer packets stay sealed (one job + CV slice). Human approval before submit.

Repo layout, how to add a scout source, and how to add a UI screen: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Feature index: [docs/FEATURES.md](docs/FEATURES.md). Local HTTP contract: [docs/API.md](docs/API.md).
