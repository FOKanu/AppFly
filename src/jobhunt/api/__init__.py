"""Local HTTP API that drives the existing Jobhunt engine.

Purpose: Package FastAPI routes and DTOs for a loopback frontend.
Inputs: None at import time; call ``create_app``.
Returns: Package namespace.
Does not: Reimplement scout/match/write or crawl deny-listed hosts.
"""

from jobhunt.api.app import create_app

__all__ = ["create_app"]
