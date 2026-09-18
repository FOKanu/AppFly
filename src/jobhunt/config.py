from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field


REPO_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_DIR = REPO_ROOT / "vault-templates"
DEFAULT_CONFIG_PATH = REPO_ROOT / "config.yaml"
EXAMPLE_CONFIG_PATH = REPO_ROOT / "config.example.yaml"


class ApifyConfig(BaseModel):
    """Public-page fetch only. Deny-listed job boards are rejected in policy.py."""

    enabled: bool = False
    start_urls: list[str] = Field(default_factory=list)


class SourcesConfig(BaseModel):
    agentur: bool = True
    inbox: bool = True
    rss: list[str] = Field(default_factory=list)
    apify: ApifyConfig = Field(default_factory=ApifyConfig)


class AppConfig(BaseModel):
    vault_path: Path = Path("~/Documents/Job Search")
    keywords: list[str] = Field(default_factory=lambda: ["Software Engineer"])
    location: str = "Berlin"
    radius_km: int = 50
    published_days: int = 7
    letter_cap: int = 5
    shortlist_size: int = 8
    gemini_model: str = "gemini-2.5-flash"
    jd_excerpt_chars: int = 1200
    sources: SourcesConfig = Field(default_factory=SourcesConfig)
    config_path: Path = DEFAULT_CONFIG_PATH

    @property
    def vault(self) -> Path:
        return self.vault_path.expanduser().resolve()

    @property
    def cache_dir(self) -> Path:
        return REPO_ROOT / ".cache"

    @property
    def gemini_api_key(self) -> str:
        """Gemini key for the writer.

        Purpose: in-process engine only (``write.py``). Prefers the write-only
        secret store, then ``GEMINI_API_KEY`` in the environment.
        Does not: belong in HTTP GET /settings.
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
        Does not: belong in HTTP GET /settings.
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

        Purpose: in-process scout/agentur only. Prefers a user-saved override,
        then ``JOBSUCHE_API_KEY``, then the public default ``jobboerse-jobsuche``.
        Does not: treat that public default as Settings "configured" — that
        flag lives in ``features.secrets.store.is_configured``.
        """

        from jobhunt.features.secrets.names import JOBSUCHE_PUBLIC_DEFAULT, SecretName
        from jobhunt.features.secrets.store import get_for_runtime

        stored = get_for_runtime(SecretName.jobsuche)
        if stored:
            return stored
        return os.environ.get("JOBSUCHE_API_KEY", JOBSUCHE_PUBLIC_DEFAULT).strip()


def load_env() -> None:
    load_dotenv(REPO_ROOT / ".env")


def load_config(path: Path | None = None) -> AppConfig:
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
    if dest.exists():
        return
    dest.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def _read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping")
    return data
