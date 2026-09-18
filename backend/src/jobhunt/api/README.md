"""Local HTTP API for the Jobhunt Copilot UI.

Purpose: FastAPI routes wrapping scout, match, write, and the vault.
Inputs: ``python -m jobhunt.api`` (binds 127.0.0.1:8787) or ``create_app``.
Returns: JSON. GET bodies never include connector secrets.
Does not: Crawl deny-listed hosts or submit applications.
"""
