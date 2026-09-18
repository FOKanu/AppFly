"""Local HTTP API package.

Purpose: Settings and other localhost routes for the copilot.
Does not: scrape job boards or return connector secret values.
"""

from jobhunt.api.app import app, create_app

__all__ = ["app", "create_app"]
