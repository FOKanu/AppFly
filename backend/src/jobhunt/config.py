"""App config, paths, and environment keys.

Purpose: Load ``config.yaml`` / ``config.example.yaml`` and ``.env`` from the repo root.
Inputs: Optional config path; Gemini/Agentur keys from the environment.
Returns: ``AppConfig`` and helpers used by CLI, scout, match, and write.
Does not: Fetch jobs, store secrets in GET responses, or crawl the web.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Literal

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# This file lives at <repo>/backend/src/jobhunt/config.py.
# Config, .env, vault templates, and the embedding cache stay at the git root
# so `jobhunt init` behavior is unchanged after the monorepo split.
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
TEMPLATE_DIR = REPO_ROOT / "vault-templates"
DEFAULT_CONFIG_PATH = REPO_ROOT / "config.yaml"
EXAMPLE_CONFIG_PATH = REPO_ROOT / "config.example.yaml"


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
    config_path: Path = DEFAULT_CONFIG_PATH

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

    load_dotenv(REPO_ROOT / ".env")


def load_config(path: Path | None = None) -> AppConfig:
    """Read YAML config from disk (or the example file on first use).

    Purpose: Single loader for CLI commands.
    Inputs: Optional path; default is ``<repo>/config.yaml``.
    Returns: Validated ``AppConfig``.
    Does not: Create the vault or fetch jobs.
    """
    load_env()
    config_path = path or DEFAULT_CONFIG_PATH
    if not config_path.exists():
        if EXAMPLE_CONFIG_PATH.exists() and path is None:
            raw = _read_yaml(EXAMPLE_CONFIG_PATH)
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
    Inputs: Destination path (usually repo-root ``config.yaml``).
    Returns: None; no-op when ``dest`` already exists.
    Does not: Overwrite an existing config.
    """
    if dest.exists():
        return
    dest.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def _read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping")
    return data
