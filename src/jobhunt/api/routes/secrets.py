"""Secret write/delete stubs.

Purpose: Reserve PUT/DELETE /settings/secrets/{name} for the secrets feature.
Inputs: Path ``name`` (gemini or apify).
Returns: HTTP 501 with a fixed message; never echoes values.
Does not: Talk to macOS Keychain, persist keys, or return last-4 digits.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["secrets"])

_KNOWN_SECRETS = frozenset({"gemini", "apify"})
_STUB_MESSAGE = "implemented by secrets feature"


@router.put("/settings/secrets/{name}")
def put_secret(name: str) -> None:
    """Stub: store a connector secret (not implemented here).

    Purpose: Keep the URL stable so the secrets feature can land later.
    Inputs: ``name`` is ``gemini`` or ``apify``; body is ignored.
    Returns: HTTP 501.
    Does not: Save keys, print them, or return last-4 digits.
    """

    _reject(name)


@router.delete("/settings/secrets/{name}")
def delete_secret(name: str) -> None:
    """Stub: delete a connector secret (not implemented here).

    Purpose: Keep the URL stable so the secrets feature can land later.
    Inputs: ``name`` is ``gemini`` or ``apify``.
    Returns: HTTP 501.
    Does not: Touch Keychain or echo leftover values.
    """

    _reject(name)


def _reject(name: str) -> None:
    """Validate the secret name then return 501.

    Purpose: Distinguish unknown names from the unimplemented store.
    Inputs: Connector name from the path.
    Returns: Never returns normally; always raises HTTPException.
    Does not: Read environment values.
    """

    key = name.strip().casefold()
    if key not in _KNOWN_SECRETS:
        raise HTTPException(status_code=400, detail=f"unknown secret: {name}")
    raise HTTPException(status_code=501, detail=_STUB_MESSAGE)
