"""Canonical names for connector secrets.

Purpose: one enum so HTTP paths, the keychain account, and config stay in sync.
Does not: store key material or invent extra aliases (no last-4, no plaintext).
"""

from __future__ import annotations

from enum import Enum

JOBSUCHE_PUBLIC_DEFAULT = "jobboerse-jobsuche"
"""Public Arbeitsagentur client id. Not a user-saved override."""


class SecretName(str, Enum):
    """Connectors the Settings UI may save.

    Values are the URL path segment: ``/settings/secrets/{name}``.
    """

    gemini = "gemini"
    apify = "apify"
    jobsuche = "jobsuche"

    @property
    def env_var(self) -> str:
        """Environment variable used as a runtime fallback.

        Purpose: ``config.py`` can prefer the store, then this env var.
        Does not: mean Settings should treat the env var as GET-able.
        """

        return {
            SecretName.gemini: "GEMINI_API_KEY",
            SecretName.apify: "APIFY_TOKEN",
            SecretName.jobsuche: "JOBSUCHE_API_KEY",
        }[self]

    @classmethod
    def parse(cls, value: str | SecretName) -> SecretName:
        """Turn a path/API name into a known secret.

        Purpose: reject unknown connectors with a clear error (HTTP 400).
        Does not: accept env-var spellings or last-4 hints as names.
        """

        if isinstance(value, cls):
            return value
        raw = str(value).strip().casefold()
        try:
            return cls(raw)
        except ValueError as exc:
            raise UnknownSecretError(str(value)) from exc


class UnknownSecretError(ValueError):
    """The name is not gemini, apify, or jobsuche.

    Purpose: HTTP layer maps this to 400 without leaking any secret value.
    """

    def __init__(self, name: str) -> None:
        self.name = name
        allowed = ", ".join(item.value for item in SecretName)
        super().__init__(f"Unknown secret name {name!r}. Use one of: {allowed}.")
