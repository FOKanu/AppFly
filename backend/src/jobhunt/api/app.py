"""FastAPI application (health only in A0).

Purpose: Mount the local HTTP surface for the Jobhunt Copilot UI.
Inputs: None at import time.
Returns: A FastAPI app with GET /health.
Does not: List jobs, start runs, read API keys, or crawl the web.
"""

from __future__ import annotations

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Build the API application.

    Purpose: Factory so tests and uvicorn share the same routes.
    Inputs: None.
    Returns: FastAPI instance with GET /health only.
    Does not: Register jobs/runs/settings routes (those belong to A1).
    """

    application = FastAPI(
        title="Jobhunt Copilot",
        version="0.1.0",
        description="Local-first job copilot API. Secrets never appear in GET bodies.",
    )

    @application.get("/health")
    def health() -> dict[str, str]:
        """Liveness probe.

        Purpose: Tell the UI and operators that the API process is up.
        Inputs: None.
        Returns: ``{"status": "ok"}`` with no secret values.
        Does not: Check Gemini/Apify keys or read the vault.
        """

        return {"status": "ok"}

    return application


app = create_app()
