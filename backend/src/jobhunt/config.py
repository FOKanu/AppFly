"""App config, paths, and environment keys.

Purpose: Load ``config.yaml`` / ``config.example.yaml`` and ``.env`` from the repo root.
Inputs: Optional config path; Gemini/Agentur keys from the environment.
Returns: ``AppConfig`` and helpers used by CLI, scout, match, and write.
Does not: Fetch jobs, store secrets in GET responses, or crawl the web.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal, Mapping

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# This file lives at <repo>/backend/src/jobhunt/config.py.
# Config, .env, vault templates, and the embedding cache stay at the git root
# so `jobhunt init` behavior is unchanged after the monorepo split.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
TEMPLATE_DIR = REPO_ROOT / "vault-templates"
EXAMPLE_CONFIG_PATH = REPO_ROOT / "config.example.yaml"


def is_source_checkout() -> bool:
    """True when running from a git checkout (backend/pyproject.toml beside the package)."""
    # Check if we're in a source checkout by looking for pyproject.toml in backend directory
    backend_pyproject = REPO_ROOT / "backend" / "pyproject.toml"
    return backend_pyproject.is_file()


def resolve_config_dir(env: Mapping[str, str] | None = None) -> Path:
    """Directory holding config.yaml, .env and .secrets/.

    Order: APPFLY_CONFIG_DIR, then a source checkout with config.yaml (legacy dev), then the data dir.
    """
    env = os.environ if env is None else env
    override = (env.get("APPFLY_CONFIG_DIR") or "").strip()
    if override:
        return Path(override).expanduser().resolve()
    # Check if this is a source checkout AND has config.yaml file
    if is_source_checkout() and (REPO_ROOT / "config.yaml").is_file():
        return REPO_ROOT
    from jobhunt.store.paths import default_data_root

    return default_data_root()


def default_config_path() -> Path:
    return resolve_config_dir() / "config.yaml"


def default_env_path() -> Path:
    return resolve_config_dir() / ".env"




class ApifyConfig(BaseModel):
    """Public-page fetch only. Deny-listed job boards are rejected in policy.py.

    Purpose: Hold Apify actor settings from YAML.
    Inputs: ``enabled`` flag and ``start_urls`` from config.
    Returns: Validated model used by the scout Apify adapter.
    Does not: Start an actor or bypass ``assert_crawl_allowed``.
    """

    enabled: bool = False
    start_urls: list[str] = Field(default_factory=list)


class SourcesConfig(BaseModel):
    """Which ingest channels are enabled.

    Purpose: Toggle Agentur, inbox, RSS, and Apify from YAML.
    Inputs: Mapping under ``sources:`` in config.
    Returns: Validated flags and RSS URL list.
    Does not: Fetch those sources (scout does).
    """

    agentur: bool = True
    inbox: bool = True
    rss: list[str] = Field(default_factory=list)
    apify: ApifyConfig = Field(default_factory=ApifyConfig)


class AppConfig(BaseModel):
    """Runtime settings for one jobhunt workspace.

    Purpose: Typed view of ``config.yaml`` plus env-backed keys.
    Inputs: YAML mapping plus ``config_path``.
    Returns: Paths, keywords, letter cap, and source flags.
    Does not: Persist secrets into the YAML file.
    """
    vault_path: Path = Path("~/Documents/Job Search")
    storage_backend: Literal["native", "markdown"] = "native"
    native_data_dir: Path | None = None
    keywords: list[str] = Field(default_factory=lambda: ["Software Engineer"])
    location: str = "Berlin"
    radius_km: int = 50
    published_days: int = 7
    letter_cap: int = 5
    shortlist_size: int = 8
    gemini_model: str = "gemini-3.8-flash"
    gemini_api_base: str | None = None
    jd_excerpt_chars: int = 1200
    sources: SourcesConfig = Field(default_factory=SourcesConfig)
    config_path: Path = Field(default_factory=default_config_path)

    @property
    def vault(self) -> Path:
        return self.vault_path.expanduser().resolve()

    @property
    def gemini_base_url(self) -> str | None:
        """Base URL for the Gemini API endpoint.

        Purpose: Point the letter writer at a remote gateway.
        Inputs: YAML value `gemini_api_base` or env var `GEMINI_API_BASE`.
        Returns: First non-blank stripped value of ``gemini_api_base``, then env
            ``GEMINI_API_BASE``; else None.
        Does not: Return the key material or any secrets.
        """

        for candidate in (self.gemini_api_base, os.environ.get("GEMINI_API_BASE")):
            if candidate and candidate.strip():
                return candidate.strip()
        return None

    @property
    def native_data_path(self) -> Path:
        """App data directory for SQLite + files.

        Purpose: Native store root (override via ``native_data_dir`` or APPFLY_DATA_DIR).
        """

        if self.native_data_dir is not None:
            return Path(self.native_data_dir).expanduser().resolve()
        from jobhunt.store.paths import default_data_root

        return default_data_root()

    @property
    def cache_dir(self) -> Path:
        """App data directory for local caches like embeddings.

        Purpose: Return the cache root based on storage backend.
        Inputs: AppConfig with storage_backend field.
        Returns: Path under native_data_path / "cache" when native, else REPO_ROOT / ".cache".
        Does not: Return secrets or modify files.
        """
        if self.storage_backend == "native":
            return self.native_data_path / "cache"
        return REPO_ROOT / ".cache"

    @property
    def gemini_api_key(self) -> str:
        """Gemini key for the writer.

        Purpose: in-process engine only. Prefers the write-only secret store,
        then ``GEMINI_API_KEY`` in the environment.
        """

        from jobhunt.features.secrets.names import SecretName
        from jobhunt.features.secrets.store import get_for_runtime

        stored = get_for_runtime(SecretName.gemini)
        if stored:
            return stored
        return os.environ.get("GEMINI_API_KEY", "").strip()

    @property
    def apify_token(self) -> str:
        """Apify token for public-page fetches.

        Purpose: in-process scout/apify only. Prefers the write-only secret
        store, then ``APIFY_TOKEN`` in the environment.
        """

        from jobhunt.features.secrets.names import SecretName
        from jobhunt.features.secrets.store import get_for_runtime

        stored = get_for_runtime(SecretName.apify)
        if stored:
            return stored
        return os.environ.get("APIFY_TOKEN", "").strip()

    @property
    def jobsuche_api_key(self) -> str:
        """Arbeitsagentur Jobsuche API key.

        Purpose: in-process Agentur client. Prefers a saved override,
        then ``JOBSUCHE_API_KEY``, then the public default ``jobboerse-jobsuche``.
        """

        from jobhunt.features.secrets.names import JOBSUCHE_PUBLIC_DEFAULT, SecretName
        from jobhunt.features.secrets.store import get_for_runtime

        stored = get_for_runtime(SecretName.jobsuche)
        if stored:
            return stored
        return os.environ.get("JOBSUCHE_API_KEY", JOBSUCHE_PUBLIC_DEFAULT).strip()


def load_env() -> None:
    """Load ``<repo>/.env`` into ``os.environ`` if the file exists.

    Purpose: Make ``GEMINI_API_KEY`` / ``JOBSUCHE_API_KEY`` available.
    Inputs: None (always the repo-root ``.env``).
    Returns: None.
    Does not: Print or return secret values.
    """

    env_path = default_env_path()
    if env_path.exists():
        load_dotenv(env_path)


def load_config(path: Path | None = None) -> AppConfig:
    """Read YAML config from disk (or the example file on first use).

    Purpose: Single loader for CLI commands.
    Inputs: Optional path; default is ``<repo>/config.yaml``.
    Returns: Validated ``AppConfig``.
    Does not: Create the vault or fetch jobs.
    """
    load_env()
    config_path = path or default_config_path()
    if not config_path.exists():
        if EXAMPLE_CONFIG_PATH.exists() and path is None:
            raw = _read_yaml(EXAMPLE_CONFIG_PATH)
        elif path is None:
            raw = {}
        else:
            raise FileNotFoundError(
                f"Missing {config_path}. Run `jobhunt init` or copy config.example.yaml."
            )
    else:
        raw = _read_yaml(config_path)
    raw["config_path"] = config_path
    return AppConfig.model_validate(raw)


def write_example_config(dest: Path) -> None:
    """Copy ``config.example.yaml`` to ``dest`` if missing.

    Purpose: Used by ``jobhunt init``.
    Inputs: Destination path (usually ``default_config_path()``). Falls back to a dump of the AppConfig defaults when config.example.yaml is not shipped (installed package).
    Returns: None; no-op when ``dest`` already exists.
    Does not: Overwrite an existing config.
    """
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    if EXAMPLE_CONFIG_PATH.is_file():
        dest.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        import yaml
        from jobhunt.config import AppConfig
        dest.write_text(
            yaml.safe_dump(AppConfig().model_dump(mode="json", exclude={"config_path"}), sort_keys=False),
            encoding="utf-8"
        )


def migrate_repo_config(dest_dir: Path) -> list[str]:
    """Copy repo-root config.yaml, .env and .secrets/* into ``dest_dir``.

    Purpose: ``jobhunt config-migrate`` for users moving from a source checkout to the app.
    Returns: relative names of the files copied ("config.yaml", ".env", ".secrets/<name>").
    Does not: move, delete or overwrite anything. The repo copies keep winning
    (resolve_config_dir rule 2) until the user deletes them.
    Secrets (.env, .secrets/*) are created 0600 and .secrets/ 0700 on POSIX, never world-readable in between.
    """
    if not is_source_checkout():
        return []
    dest_dir = Path(dest_dir)
    copied: list[str] = []
    pairs: list[tuple[Path, str]] = [(REPO_ROOT / "config.yaml", "config.yaml"), (REPO_ROOT / ".env", ".env")]
    secrets = REPO_ROOT / ".secrets"
    if secrets.is_dir():
        pairs += [(p, f".secrets/{p.name}") for p in sorted(secrets.iterdir()) if p.is_file()]
    for src, rel in pairs:
        target = dest_dir / rel
        if not src.is_file() or target.exists():
            continue
        secret = rel != "config.yaml"
        if rel.startswith(".secrets/"):
            sdir = dest_dir / ".secrets"
            sdir.mkdir(parents=True, exist_ok=True, mode=0o700)
            if os.name == "posix":
                os.chmod(sdir, 0o700)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
        data = src.read_bytes()
        if secret and os.name == "posix":
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as fh:
                fh.write(data)
            os.chmod(target, 0o600)
        else:
            target.write_bytes(data)
        copied.append(rel)
    return copied


def _read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping")
    return data
