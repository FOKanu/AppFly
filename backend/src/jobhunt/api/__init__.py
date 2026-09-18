"""Local HTTP API package.

Purpose: Expose the FastAPI app for uvicorn and tests.
Inputs: Imported as ``jobhunt.api``.
Returns: ``app`` and ``create_app``.
Does not: Implement jobs, runs, or settings business routes (A1).
"""

from jobhunt.api.app import app, create_app

__all__ = ["app", "create_app"]
