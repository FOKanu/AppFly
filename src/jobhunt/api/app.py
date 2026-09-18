"""FastAPI application factory for the local Jobhunt API.

Purpose: Wire routes, CORS, and config path for a loopback server.
Inputs: Optional ``config_path`` pointing at ``config.yaml``.
Returns: A FastAPI app bound by the caller to ``127.0.0.1:8787``.
Does not: Start uvicorn, crawl job boards, or expose API keys.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from jobhunt.config import AppConfig, load_config
from jobhunt.vault import Vault

# Vite / typical local frontend origins. Regex covers other localhost ports.
_LOCAL_ORIGIN_REGEX = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"


def get_config(request: Request) -> AppConfig:
    """Load AppConfig for this request.

    Purpose: Reuse ``jobhunt.config.load_config`` (no second YAML schema).
    Inputs: FastAPI request whose app.state may hold ``config_path``.
    Returns: Validated ``AppConfig``.
    Does not: Return API key values to the client.
    """

    path = getattr(request.app.state, "config_path", None)
    return load_config(path)


def get_vault(request: Request) -> Vault:
    """Open the Obsidian vault the same way the CLI does.

    Purpose: Give routes a ``Vault`` rooted at ``AppConfig.vault``.
    Inputs: FastAPI request (config is loaded from app state).
    Returns: ``Vault`` instance; directories are not created.
    Does not: Fetch listing URLs or read secrets from the environment into responses.
    """

    return Vault(get_config(request).vault)


def create_app(config_path: Path | None = None) -> FastAPI:
    """Build the local HTTP API.

    Purpose: Expose health, jobs, runs, and settings for the Queue UI.
    Inputs: Optional path to ``config.yaml`` (tests pass a temp file).
    Returns: FastAPI application with CORS for localhost frontends.
    Does not: Serve the React app, enable Apify, or store Keychain secrets.
    """

    from jobhunt.api.routes.health import router as health_router
    from jobhunt.api.routes.jobs import router as jobs_router
    from jobhunt.api.routes.runs import router as runs_router
    from jobhunt.api.routes.secrets import router as secrets_router
    from jobhunt.api.routes.settings import router as settings_router

    application = FastAPI(
        title="Jobhunt Copilot API",
        version="0.1.0",
        description="Local-first API wrapping scout, match, write, and the vault.",
    )
    application.state.config_path = config_path
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[],
        allow_origin_regex=_LOCAL_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(health_router)
    application.include_router(jobs_router)
    application.include_router(runs_router)
    application.include_router(settings_router)
    application.include_router(secrets_router)
    return application
