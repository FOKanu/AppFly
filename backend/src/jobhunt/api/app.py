"""FastAPI application factory for the local Jobhunt API.

Purpose: Wire routes, CORS, config path, and AppStore for a loopback server.
Inputs: Optional ``config_path`` pointing at ``config.yaml``.
Returns: A FastAPI app bound by the caller to ``127.0.0.1:8787``.
Does not: Start uvicorn, crawl job boards, or expose API keys.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from jobhunt.api.security import (
    ALLOWED_HOSTS,
    CSRF_HEADER,
    CSRFMiddleware,
    allowed_origins,
)
from jobhunt.config import AppConfig, load_config
from jobhunt.features.secrets.store import SecretStore, get_store
from jobhunt.store import get_store as get_app_store_for_config
from jobhunt.store.protocol import AppStore
from jobhunt.vault import Vault


def get_config(request: Request) -> AppConfig:
    """Load AppConfig for this request."""

    path = getattr(request.app.state, "config_path", None)
    if isinstance(path, str):
        path = Path(path)
    return load_config(path)


def get_app_store(request: Request) -> AppStore:
    """Return the workspace AppStore (native or markdown).

    Purpose: Routes and pipeline share one store per app instance.
    Inputs: FastAPI request; ``app.state.app_store`` may be cached.
    Returns: ``AppStore`` from ``get_store(config)``.
    Does not: Return API keys.
    """

    cached = getattr(request.app.state, "app_store", None)
    if cached is not None:
        return cached
    store = get_app_store_for_config(get_config(request))
    request.app.state.app_store = store
    return store


def get_vault(request: Request) -> Vault:
    """Open the Obsidian vault when using markdown backend.

    Purpose: Backward-compatible helper for routes still using Vault directly.
    Inputs: FastAPI request.
    Returns: ``Vault`` at ``AppConfig.vault``.
    Does not: Prefer this over ``get_app_store`` for new code.
    """

    return Vault(get_config(request).vault)


def get_secret_store(request: Request) -> SecretStore:
    """Return the write-only secret store for this app instance."""

    store = getattr(request.app.state, "secret_store", None)
    if store is None:
        return get_store()
    return store


def create_app(
    config_path: Path | None = None,
    *,
    store: SecretStore | None = None,
) -> FastAPI:
    """Build the local HTTP API."""

    from jobhunt.api.routes.documents import router as documents_router
    from jobhunt.api.routes.health import router as health_router
    from jobhunt.api.routes.jobs import router as jobs_router
    from jobhunt.api.routes.requirements import router as requirements_router
    from jobhunt.api.routes.runs import router as runs_router
    from jobhunt.api.routes.secrets import router as secrets_router
    from jobhunt.api.routes.settings import router as settings_router
    from jobhunt.api.routes.workspace import router as workspace_router

    application = FastAPI(
        title="Jobhunt Copilot API",
        version="0.2.0",
        description="Local-first API with native SQLite store and optional Obsidian import.",
    )
    application.state.config_path = config_path
    application.state.secret_store = store if store is not None else get_store()
    application.state.app_store = None

    origins = allowed_origins()
    application.add_middleware(CSRFMiddleware, allowed_origins=origins)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Content-Type", CSRF_HEADER],
    )
    application.add_middleware(TrustedHostMiddleware, allowed_hosts=list(ALLOWED_HOSTS))
    application.include_router(health_router)
    application.include_router(jobs_router)
    application.include_router(runs_router)
    application.include_router(settings_router)
    application.include_router(requirements_router)
    application.include_router(secrets_router)
    application.include_router(documents_router)
    application.include_router(workspace_router)
    return application
