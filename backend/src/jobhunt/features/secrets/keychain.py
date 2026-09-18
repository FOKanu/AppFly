"""OS keychain adapter for connector secrets.

Purpose: persist API keys outside git, the Obsidian vault, and HTTP responses.
On macOS this uses the Keychain via the ``keyring`` library. On CI/Linux,
or when no OS vault is available, it falls back to a gitignored ``.secrets/``
directory. Tests inject ``MemoryKeychain`` so they never touch a real Keychain.
Does not: log passwords, commit files, or expose values over HTTP.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Protocol, runtime_checkable

SERVICE_NAME = "appfly.jobhunt"
"""Keychain service name. Keep stable so saved keys keep resolving."""

PROBE_ACCOUNT = "__jobhunt_probe__"


@runtime_checkable
class Keychain(Protocol):
    """Storage backend for connector secrets.

    Purpose: mockable interface so tests never touch the real Keychain.
    Account names are ``SecretName`` values (``gemini``, ``apify``, ``jobsuche``).
    """

    def get_password(self, account: str) -> str | None:
        """Return the stored secret, or None if missing."""

    def set_password(self, account: str, password: str) -> None:
        """Create or overwrite (rotate) the stored secret."""

    def delete_password(self, account: str) -> None:
        """Unset the secret. Missing keys are a no-op."""


class MacOSKeychain:
    """macOS Keychain via the ``keyring`` library.

    Purpose: the default adapter on a developer Mac. ``keyring`` may also
    select another OS vault (for example Linux Secret Service); we still
    use this class whenever an OS backend answers.
    Does not: print the password or write into the vault / repo.
    """

    def get_password(self, account: str) -> str | None:
        import keyring

        try:
            value = keyring.get_password(SERVICE_NAME, account)
        except Exception:
            return None
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    def set_password(self, account: str, password: str) -> None:
        import keyring

        keyring.set_password(SERVICE_NAME, account, password)

    def delete_password(self, account: str) -> None:
        import keyring
        from keyring.errors import PasswordDeleteError

        try:
            keyring.delete_password(SERVICE_NAME, account)
        except PasswordDeleteError:
            return
        except Exception:
            return


class FileKeychain:
    """Gitignored file fallback when Keychain is unavailable (CI/Linux).

    Purpose: keep local Settings usable without an OS vault.
    Files live under ``.secrets/<account>`` with mode 0600.
    Does not: belong in git. ``.secrets/`` is gitignored.
    """

    def __init__(self, root: Path) -> None:
        self.root = Path(root)

    def get_password(self, account: str) -> str | None:
        path = self._path(account)
        if not path.is_file():
            return None
        try:
            value = path.read_text(encoding="utf-8")
        except OSError:
            return None
        stripped = value.strip()
        return stripped or None

    def set_password(self, account: str, password: str) -> None:
        path = self._path(account)
        self._ensure_root()
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(password)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass

    def delete_password(self, account: str) -> None:
        path = self._path(account)
        try:
            path.unlink()
        except FileNotFoundError:
            return

    def _ensure_root(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.root, 0o700)
        except OSError:
            pass

    def _path(self, account: str) -> Path:
        """Map an account name to a file inside ``root``.

        Purpose: reject path traversal so we never write outside ``.secrets/``.
        """

        if not account or account != Path(account).name or ".." in account:
            raise ValueError("Invalid secret account name.")
        return self.root / account


class MemoryKeychain:
    """In-process map for tests.

    Purpose: mock the Keychain without files, ``security``, or ``keyring``.
    Does not: persist across processes.
    """

    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    def get_password(self, account: str) -> str | None:
        return self._data.get(account)

    def set_password(self, account: str, password: str) -> None:
        self._data[account] = password

    def delete_password(self, account: str) -> None:
        self._data.pop(account, None)


def default_secrets_dir() -> Path:
    """Repo-local ``.secrets/`` directory used when Keychain is missing.

    Purpose: Linux/CI fallback. Never commit this folder.
    """

    from jobhunt.config import REPO_ROOT

    return REPO_ROOT / ".secrets"


def default_keychain() -> Keychain:
    """Pick macOS Keychain, else a gitignored ``.secrets/`` directory.

    Purpose: production default. Tests should pass ``MemoryKeychain`` instead.
    ``JOBHUNT_SECRETS_DIR`` forces the file backend (used by pytest).
    """

    override = os.environ.get("JOBHUNT_SECRETS_DIR", "").strip()
    if override:
        return FileKeychain(Path(override))
    if os_keychain_available():
        return MacOSKeychain()
    return FileKeychain(default_secrets_dir())


def os_keychain_available() -> bool:
    """Whether ``keyring`` has a real OS backend (not the fail stub).

    Purpose: decide between Keychain and the file fallback.
    Does not: store a probe secret.
    """

    try:
        import keyring
        from keyring.backends.fail import Keyring as FailKeyring
    except Exception:
        return False

    try:
        backend = keyring.get_keyring()
    except Exception:
        return False
    if isinstance(backend, FailKeyring):
        return False
    module = type(backend).__module__.casefold()
    name = type(backend).__name__.casefold()
    if "fail" in module or "fail" in name or "null" in name:
        return False
    try:
        backend.get_password(SERVICE_NAME, PROBE_ACCOUNT)
    except Exception:
        return False
    return True
