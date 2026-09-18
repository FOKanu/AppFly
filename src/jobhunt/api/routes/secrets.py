"""HTTP routes for write-only connector secrets.

Purpose: Settings can save/delete Gemini and Apify keys. GET /settings only
returns boolean flags so the UI never displays key material.
Does not: call ``get_for_runtime`` for a response body, return last-4, or
log the PUT value.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from jobhunt.features.secrets.names import SecretName, UnknownSecretError
from jobhunt.features.secrets.store import EmptySecretError, SecretStore

router = APIRouter()


class SecretWriteRequest(BaseModel):
    """PUT body for ``/settings/secrets/{name}``.

    Purpose: accept the new key once. Rotate = send a new value.
    Does not: include last-4 or a read-back field.
    """

    value: str = Field(..., min_length=1)


class SecretWriteResult(BaseModel):
    """PUT/DELETE result.

    Purpose: tell the UI whether a key is now present.
    Does not: echo the secret.
    """

    configured: bool


class SettingsFlags(BaseModel):
    """GET /settings payload.

    Purpose: connector status for the Settings UI.
    Does not: include plaintext, last-4, or env values.
    """

    gemini: bool
    apify: bool
    jobsuche: bool


def get_secret_store(request: Request) -> SecretStore:
    """Read the store attached to the FastAPI app.

    Purpose: tests inject a MemoryKeychain via ``create_app(store=...)``.
    Does not: fall back to reading secrets from the request.
    """

    return request.app.state.secret_store


@router.get("/settings", response_model=SettingsFlags)
def get_settings(request: Request) -> SettingsFlags:
    """Boolean flags for each connector.

    Purpose: Settings UI status. Uses ``is_configured`` only.
    Does not: call ``get_for_runtime`` (that would load key material into
    this handler, which we never want on GET).
    """

    store = get_secret_store(request)
    return SettingsFlags(
        gemini=store.is_configured(SecretName.gemini),
        apify=store.is_configured(SecretName.apify),
        jobsuche=store.is_configured(SecretName.jobsuche),
    )


@router.put(
    "/settings/secrets/{name}",
    response_model=SecretWriteResult,
)
def put_secret(name: str, body: SecretWriteRequest, request: Request) -> SecretWriteResult:
    """Save or rotate a connector key.

    Purpose: Settings writes the key to Keychain (or ``.secrets/``).
    Does not: return the value that was stored.
    """

    store = get_secret_store(request)
    secret = _parse_name(name)
    try:
        store.save(secret, body.value)
    except EmptySecretError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except UnknownSecretError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SecretWriteResult(configured=True)


@router.delete(
    "/settings/secrets/{name}",
    response_model=SecretWriteResult,
)
def delete_secret_route(name: str, request: Request) -> SecretWriteResult:
    """Unset a connector key.

    Purpose: Settings delete control. Idempotent.
    Does not: return leftover key material.
    """

    store = get_secret_store(request)
    secret = _parse_name(name)
    try:
        store.delete(secret)
    except UnknownSecretError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SecretWriteResult(configured=False)


def _parse_name(name: str) -> SecretName:
    """Map the path segment to a known secret or HTTP 400.

    Purpose: unknown names must be 400 (not FastAPI's 422 enum error).
    Does not: treat env-var spellings as valid names.
    """

    try:
        return SecretName.parse(name)
    except UnknownSecretError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
