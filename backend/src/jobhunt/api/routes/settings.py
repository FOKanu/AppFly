"""Config.yaml settings routes (no secret values).

Purpose: Let the UI read and update AppConfig fields on disk.
Inputs: ``config.yaml`` via ``load_config``; PUT body is a closed set of keys.
Returns: Safe settings snapshot; secrets only as booleans from the store.
Does not: Accept or echo API keys, last-4 digits, or a second YAML schema.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import ValidationError

from jobhunt.api.app import get_config, get_secret_store
from jobhunt.api.schemas.settings import (
    ApifyPublic,
    HealthFlags,
    SecretFlags,
    SettingsResponse,
    SettingsUpdate,
    SourcesPublic,
)
from jobhunt.config import AppConfig, DEFAULT_CONFIG_PATH
from jobhunt.features.secrets.names import SecretName
from jobhunt.policy import CrawlDeniedError, assert_crawl_allowed
from jobhunt.vault import Vault

router = APIRouter(tags=["settings"])

_FORBIDDEN_SECRET_KEYS = frozenset(
    {
        "gemini_api_key",
        "gemini",
        "apify_api_token",
        "apify_token",
        "apify_api_key",
        "api_key",
        "jobsuche_api_key",
        "secrets",
    }
)


@router.get("/settings", response_model=SettingsResponse)
def get_settings(request: Request) -> SettingsResponse:
    """Return safe config, health flags, and secret presence.

    Purpose: Fill the settings screen without leaking connector keys.
    Inputs: AppConfig plus vault paths and store presence flags.
    Returns: ``SettingsResponse`` (booleans for gemini/apify/jobsuche, never values).
    Does not: Include GEMINI_API_KEY, last-4 digits, or CV text.
    """

    return _settings_response(request)


@router.put("/settings", response_model=SettingsResponse)
def put_settings(
    request: Request,
    body: dict[str, Any] = Body(...),
) -> SettingsResponse:
    """Persist vault path, keywords, RSS, and source toggles.

    Purpose: Update ``config.yaml`` using the existing schema.
    Inputs: JSON object; unknown keys and API key fields are rejected.
    Returns: The same shape as GET /settings after save.
    Does not: Store gemini_api_key (use /settings/secrets later) or enable scraping of deny-listed hosts.
    """

    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object")
    secret_keys = sorted(key for key in body if str(key).casefold() in _FORBIDDEN_SECRET_KEYS)
    if secret_keys:
        raise HTTPException(
            status_code=400,
            detail=(
                "API keys are not accepted on PUT /settings "
                f"(rejected: {', '.join(secret_keys)}). Use PUT /settings/secrets/{{name}}."
            ),
        )
    try:
        patch = SettingsUpdate.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    rss_urls = list(patch.rss or [])
    if patch.sources is not None and patch.sources.rss is not None:
        if patch.rss is not None and patch.rss != patch.sources.rss:
            raise HTTPException(status_code=400, detail="rss and sources.rss do not match")
        rss_urls = list(patch.sources.rss)
    for url in rss_urls:
        try:
            assert_crawl_allowed(url, source="rss")
        except CrawlDeniedError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    config_path = _config_file_path(request)
    raw = _read_yaml(config_path)
    if patch.vault_path is not None:
        raw["vault_path"] = patch.vault_path
    if patch.keywords is not None:
        raw["keywords"] = patch.keywords
    if patch.location is not None:
        raw["location"] = patch.location
    sources = raw.get("sources")
    if not isinstance(sources, dict):
        sources = {}
        raw["sources"] = sources
    if patch.rss is not None:
        sources["rss"] = patch.rss
    if patch.sources is not None:
        if patch.sources.agentur is not None:
            sources["agentur"] = patch.sources.agentur
        if patch.sources.inbox is not None:
            sources["inbox"] = patch.sources.inbox
        if patch.sources.rss is not None:
            sources["rss"] = patch.sources.rss
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    request.app.state.config_path = config_path
    return _settings_response(request)


def _settings_response(request: Request) -> SettingsResponse:
    """Build the GET /settings payload.

    Purpose: Centralize the secret-free snapshot.
    Inputs: Request (config path on app.state).
    Returns: ``SettingsResponse``.
    Does not: Copy environment values into the JSON.
    """

    config = get_config(request)
    vault = Vault(config.vault)
    config_path = _config_file_path(request)
    return SettingsResponse(
        vault_path=str(config.vault_path),
        keywords=list(config.keywords),
        location=config.location,
        sources=SourcesPublic(
            agentur=config.sources.agentur,
            inbox=config.sources.inbox,
            rss=list(config.sources.rss),
            apify=ApifyPublic(
                enabled=config.sources.apify.enabled,
                start_urls=list(config.sources.apify.start_urls),
            ),
        ),
        health=_health_flags(config, vault, config_path),
        secrets=_secret_flags(request),
        letter_cap=config.letter_cap,
        shortlist_size=config.shortlist_size,
        gemini_model=config.gemini_model,
    )


def _secret_flags(request: Request) -> SecretFlags:
    """Boolean presence flags from the write-only store.

    Purpose: Settings UI status without loading key material for GET.
    Inputs: Request (uses ``is_configured`` only).
    Returns: ``SecretFlags``.
    Does not: Call ``get_for_runtime`` or read env values into JSON.
    """

    store = get_secret_store(request)
    return SecretFlags(
        gemini=store.is_configured(SecretName.gemini),
        apify=store.is_configured(SecretName.apify),
        jobsuche=store.is_configured(SecretName.jobsuche),
    )


def _health_flags(config: AppConfig, vault: Vault, config_path: Path) -> HealthFlags:
    """Filesystem checks for the settings screen.

    Purpose: Show whether the vault and CV files exist.
    Inputs: Config, vault, config.yaml path.
    Returns: Boolean flags only.
    Does not: Read CV contents or env secrets.
    """

    return HealthFlags(
        vault_exists=vault.root.exists(),
        jobs_dir_exists=vault.jobs_dir.exists(),
        cv_present=(vault.root / "CV" / "Master.md").exists(),
        requirements_present=(vault.root / "Requirements.md").exists(),
        config_file_exists=config_path.exists(),
    )


def _config_file_path(request: Request) -> Path:
    """YAML path this app instance reads and writes.

    Purpose: Tests inject a temp file; production uses ``config.yaml``.
    Inputs: Request app.state.
    Returns: Path (may not exist yet).
    Does not: Create the file.
    """

    path = getattr(request.app.state, "config_path", None)
    return Path(path) if path else DEFAULT_CONFIG_PATH


def _read_yaml(path: Path) -> dict[str, Any]:
    """Load existing config.yaml or start from an empty mapping.

    Purpose: Patch-in-place so unrelated keys (letter_cap, gemini_model) stay.
    Inputs: Config path.
    Returns: Dict matching the existing YAML schema.
    Does not: Invent new top-level keys.
    """

    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise HTTPException(status_code=500, detail=f"{path} must contain a YAML mapping")
    return data
