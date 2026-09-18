"""HTTP routes for write-only connector secrets.

Purpose: Settings can save/delete Gemini, Apify, and Jobsuche keys.
Does not: call ``get_for_runtime`` for a response body, return last-4, or
log the PUT value. GET /settings stays on the settings router.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from jobhunt.api.app import get_secret_store
from jobhunt.api.schemas.secrets import SecretWriteRequest, SecretWriteResult
from jobhunt.features.secrets.names import SecretName, UnknownSecretError
from jobhunt.features.secrets.store import EmptySecretError

router = APIRouter(tags=["secrets"])


@router.put(
    "/settings/secrets/{name}",
    response_model=SecretWriteResult,
)
def put_secret(name: str, body: SecretWriteRequest, request: Request) -> SecretWriteResult:
    """Save or rotate a connector key.

    Purpose: Settings writes the key to Keychain (or ``.secrets/``).
    Inputs: Path ``name`` (gemini, apify, jobsuche) and ``{"value": "..."}``.
    Returns: ``{"configured": true}``.
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
    Inputs: Path ``name``.
    Returns: ``{"configured": false}``.
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
    Inputs: Path segment from the client.
    Returns: ``SecretName``.
    Does not: treat env-var spellings as valid names.
    """

    try:
        return SecretName.parse(name)
    except UnknownSecretError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
