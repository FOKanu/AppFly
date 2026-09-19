"""Workspace init and Obsidian import routes.

Purpose: First-run native store setup and one-shot Obsidian migration.
Inputs: AppConfig + AppStore.
Returns: Readiness checklist and import reports.
Does not: Enable live Obsidian sync or dual-write.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field
from fastapi import APIRouter, HTTPException, Request

from jobhunt.api.app import get_app_store, get_config, get_secret_store
from jobhunt.features.secrets.names import SecretName
from jobhunt.store import import_obsidian_vault, init_native_workspace
from jobhunt.store.sqlite import SqliteStore
from jobhunt.store.types import WorkspaceReadiness

router = APIRouter(tags=["workspace"])


class InitResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    storage_backend: str
    data_path: str
    has_cv: bool
    has_voice: bool
    has_gemini: bool
    has_keywords: bool
    job_count: int = 0


class ImportObsidianBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vault_path: str = Field(min_length=1)


def _readiness(request: Request) -> WorkspaceReadiness:
    config = get_config(request)
    store = get_app_store(request)
    secrets = get_secret_store(request)
    docs = store.list_documents()
    return WorkspaceReadiness(
        storage_backend=getattr(store, "backend_name", config.storage_backend),
        data_path=str(store.data_path()),
        has_cv=any(d.kind == "cv" for d in docs) or bool(store.read_cv()),
        has_voice=any(d.kind == "voice" for d in docs) or bool(store.read_voice_samples()),
        has_gemini=secrets.is_configured(SecretName.gemini) or bool(config.gemini_api_key),
        has_keywords=bool(config.keywords),
        job_count=len(store.existing_source_ids()),
    )


@router.get("/workspace/status", response_model=InitResponse)
def workspace_status(request: Request) -> InitResponse:
    """Return readiness checklist for Settings / first-run."""

    r = _readiness(request)
    return InitResponse(**r.__dict__)


@router.post("/workspace/init", response_model=InitResponse)
def workspace_init(request: Request) -> InitResponse:
    """Ensure native store exists; return readiness."""

    config = get_config(request)
    if config.storage_backend == "native":
        init_native_workspace(config)
        # Refresh app.state store
        request.app.state.app_store = None
    store = get_app_store(request)
    store.ensure_dirs()
    r = _readiness(request)
    return InitResponse(**r.__dict__)


@router.post("/workspace/import/obsidian")
def workspace_import_obsidian(body: ImportObsidianBody, request: Request) -> dict:
    """One-shot import from an Obsidian vault into NativeStore."""

    config = get_config(request)
    store = get_app_store(request)
    if not isinstance(store, SqliteStore):
        # Force native for import target
        native = init_native_workspace(config)
        request.app.state.app_store = native
        store = native
    from pathlib import Path

    try:
        report = import_obsidian_vault(Path(body.vault_path), store)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return report
