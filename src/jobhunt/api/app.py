"""Local FastAPI app for Settings and other copilot routes.

Purpose: bind write-only secret routes on localhost.
Does not: expose connector secret values or crawl deny-listed hosts.
"""

from __future__ import annotations

from fastapi import FastAPI

from jobhunt.api.routes.secrets import router as secrets_router
from jobhunt.features.secrets.store import SecretStore, get_store


def create_app(*, store: SecretStore | None = None) -> FastAPI:
    """Build the local Jobhunt HTTP API.

    Purpose: Settings PUT/DELETE secrets and GET boolean flags.
    Pass ``store`` in tests (typically ``SecretStore(MemoryKeychain())``).
    Does not: add GET handlers that return key material.
    """

    application = FastAPI(
        title="Jobhunt Copilot",
        description=(
            "Local API. Connector secrets are write-only: GET /settings "
            "returns booleans only."
        ),
        version="0.1.0",
    )
    application.state.secret_store = store if store is not None else get_store()
    application.include_router(secrets_router)
    return application


app = create_app()
