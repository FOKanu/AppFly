"""Write-only connector secrets (Gemini, Apify, optional Jobsuche).

Purpose: let Settings save API keys that the engine can read in-process
while HTTP GET never echoes key material.
Does not: crawl, log secrets, or write keys into the Obsidian vault / git.
"""

from jobhunt.features.secrets.keychain import (
    FileKeychain,
    Keychain,
    MacOSKeychain,
    MemoryKeychain,
    default_keychain,
)
from jobhunt.features.secrets.names import SecretName, UnknownSecretError
from jobhunt.features.secrets.store import (
    EmptySecretError,
    SecretStore,
    delete_secret,
    get_for_runtime,
    get_store,
    is_configured,
    reset_store,
    save_secret,
)

__all__ = [
    "EmptySecretError",
    "FileKeychain",
    "Keychain",
    "MacOSKeychain",
    "MemoryKeychain",
    "SecretName",
    "SecretStore",
    "UnknownSecretError",
    "default_keychain",
    "delete_secret",
    "get_for_runtime",
    "get_store",
    "is_configured",
    "reset_store",
    "save_secret",
]
