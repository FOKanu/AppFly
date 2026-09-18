"""Save / delete / status / runtime lookup for connector secrets.

Purpose: the only module ``write`` and the Settings API should use for keys.
``is_configured`` is for HTTP GET / Settings flags. ``get_for_runtime`` is for
the in-process engine only and must not be copied into a GET body.
Does not: write secrets into the vault, Home.md, git, or frontend bundles.
"""

from __future__ import annotations

from jobhunt.features.secrets.keychain import Keychain, default_keychain
from jobhunt.features.secrets.names import SecretName, UnknownSecretError

_store: SecretStore | None = None


class EmptySecretError(ValueError):
    """PUT / save rejected because the value was blank.

    Purpose: HTTP maps this to 400. The body must not echo the value (there
    is nothing to echo).
    """

    def __init__(self) -> None:
        super().__init__("Secret value must not be empty.")


class SecretStore:
    """Write-only connector secret store backed by a Keychain.

    Purpose: Settings can save and delete keys; the engine can read them.
    Pass a ``MemoryKeychain`` in tests so nothing hits the OS.
    """

    def __init__(self, keychain: Keychain | None = None) -> None:
        self._keychain = keychain if keychain is not None else default_keychain()

    def save(self, name: SecretName | str, value: str) -> None:
        """Persist a connector key (create or rotate).

        Purpose: Settings PUT. Overwrite is how rotation works.
        Does not: write to the Obsidian vault, git, or Home.md.
        """

        secret = SecretName.parse(name)
        cleaned = (value or "").strip()
        if not cleaned:
            raise EmptySecretError()
        self._keychain.set_password(secret.value, cleaned)

    def delete(self, name: SecretName | str) -> None:
        """Unset a connector key.

        Purpose: Settings DELETE. Idempotent if the key is already gone.
        Does not: fail loudly on a missing key.
        """

        secret = SecretName.parse(name)
        self._keychain.delete_password(secret.value)

    def is_configured(self, name: SecretName | str) -> bool:
        """Whether a connector key exists.

        Purpose: Settings UI status without revealing the secret.
        Does not: return key material. Jobsuche is only true when the user
        saved an override — the public ``jobboerse-jobsuche`` default is not
        stored here, so it does not count as configured.
        """

        secret = SecretName.parse(name)
        return self._keychain.get_password(secret.value) is not None

    def get_for_runtime(self, name: SecretName | str) -> str | None:
        """Return the key for in-process engine use.

        Purpose: writer, Apify, and Jobsuche clients via ``config.py``.
        Does not: belong in HTTP GET responses or the Settings UI. Callers
        must never serialize this string onto the wire.
        """

        secret = SecretName.parse(name)
        return self._keychain.get_password(secret.value)


def get_store() -> SecretStore:
    """Process-wide store (Keychain or ``.secrets/`` fallback).

    Purpose: ``config.py`` and the default FastAPI app share one store.
    Does not: create a new Keychain on every call.
    """

    global _store
    if _store is None:
        _store = SecretStore()
    return _store


def reset_store(store: SecretStore | None = None) -> None:
    """Replace or clear the process-wide store.

    Purpose: tests inject a ``MemoryKeychain``; production leaves this alone.
    Does not: belong on the HTTP API.
    """

    global _store
    _store = store


def save_secret(name: SecretName | str, value: str) -> None:
    """Persist a connector key on the process-wide store.

    Purpose: Settings PUT and any in-process save helper.
    Does not: return the stored value.
    """

    get_store().save(name, value)


def delete_secret(name: SecretName | str) -> None:
    """Unset a connector key on the process-wide store.

    Purpose: Settings DELETE.
    Does not: return leftover key material.
    """

    get_store().delete(name)


def is_configured(name: SecretName | str) -> bool:
    """Whether a connector key exists.

    Purpose: Settings UI status without revealing the secret.
    Does not: return key material.
    """

    return get_store().is_configured(name)


def get_for_runtime(name: SecretName | str) -> str | None:
    """Return the key for in-process engine use.

    Purpose: writer / Apify via ``config.py``.
    Does not: belong in HTTP GET /settings.
    """

    return get_store().get_for_runtime(name)


# Imported by HTTP 400 handling; re-exported so routes can catch both errors.
__all__ = [
    "EmptySecretError",
    "SecretStore",
    "UnknownSecretError",
    "delete_secret",
    "get_for_runtime",
    "get_store",
    "is_configured",
    "reset_store",
    "save_secret",
]
