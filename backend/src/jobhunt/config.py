"""Load repo-root config, env, and vault template paths.

Purpose: Resolve AppFly's config.yaml, .env, cache dir, and vault templates.
Inputs: Optional path to a YAML config file.
Returns: AppConfig for the CLI and engine features.
Does not: Fetch jobs, call Gemini or Apify, or log secret values.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field


def _discover_repo_root() -> Path:
    """Find the monorepo root that holds vault-templates and config.example.yaml.

    Purpose: Keep config/vault paths correct after the package moved under backend/.
    Inputs: None (walks parents of this file).
    Returns: Absolute path to the AppFly repository root.
    Does not: Create files or read secret env values.
    """
    start = Path(__file__).resolve()
    for parent in start.parents:
        if (parent / "vault-templates").is_dir() and (parent / "config.example.yaml").is_file():
            return parent
    raise RuntimeError(
        "Could not find the AppFly repo root (expected vault-templates/ and config.example.yaml)."
    )


REPO_ROOT = _discover_repo_root()
TEMPLATE_DIR = REPO_ROOT / "vault-templates"
DEFAULT_CONFIG_PATH = REPO_ROOT / "config.yaml"
EXAMPLE_CONFIG_PATH = REPO_ROOT / "config.example.yaml"


class ApifyConfig(BaseModel):
    """Public-page fetch settings. Deny-listed job boards are rejected in policy.py.

    Purpose: Hold Apify on/off and start URLs for constrained public-page fetches.
    Inputs: YAML `sources.apify` mapping.
    Returns: Typed settings used by the scout Apify stub.
    Does not: Start an actor or accept cookies/session tokens.
    """

    enabled: bool = False
    start_urls: list[str] = Field(default_factory=list)


class SourcesConfig(BaseModel):
    """Which scout sources run during `jobhunt scout`.

    Purpose: Toggle Agentur, inbox, RSS, and Apify collection.
    Inputs: YAML `sources` mapping.
    Returns: Typed source switches.
    Does not: Perform HTTP or parse inbox files.
    """

    agentur: bool = True
    inbox: bool = True
    rss: list[str] = Field(default_factory=list)
    apify: ApifyConfig = Field(default_factory=ApifyConfig)


class AppConfig(BaseModel):
    """Runtime settings for scout, match, write, and the vault.

    Purpose: Typed view of config.yaml plus env-backed keys.
    Inputs: YAML mapping plus process environment.
    Returns: Paths, keywords, caps, and source flags.
    Does not: Print API keys or write the vault.
    """

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
        """Expanded absolute vault directory.

        Purpose: Resolve `~` in vault_path for Vault I/O.
        Inputs: None (uses vault_path).
        Returns: Absolute Path.
        Does not: Create the directory.
        """
        return self.vault_path.expanduser().resolve()

    @property
    def cache_dir(self) -> Path:
        """Embedding and launchd cache directory at the repo root.

        Purpose: Keep model/cache files out of the vault.
        Inputs: None.
        Returns: `<repo>/.cache`.
        Does not: Create the directory.
        """
        return REPO_ROOT / ".cache"

    @property
    def gemini_api_key(self) -> str:
        """Gemini key from the environment.

        Purpose: Supply the writer without storing the key in YAML.
        Inputs: GEMINI_API_KEY.
        Returns: Stripped key or empty string.
        Does not: Log or return the key to HTTP clients.
        """
        return os.environ.get("GEMINI_API_KEY", "").strip()

    @property
    def jobsuche_api_key(self) -> str:
        """Arbeitsagentur Jobsuche client key.

        Purpose: Header for the official-style Jobsuche API client.
        Inputs: JOBSUCHE_API_KEY, defaulting to the public client id.
        Returns: Stripped key.
        Does not: Log the value.
        """
        return os.environ.get("JOBSUCHE_API_KEY", "jobboerse-jobsuche").strip()


def load_env() -> None:
    """Load repo-root `.env` into the process environment.

    Purpose: Pick up GEMINI_API_KEY and JOBSUCHE_API_KEY for this process.
    Inputs: `<repo>/.env` if present.
    Returns: None.
    Does not: Print file contents or keys.
    """
    load_dotenv(REPO_ROOT / ".env")


def load_config(path: Path | None = None) -> AppConfig:
    """Read YAML config (or the example file) and return AppConfig.

    Purpose: Single entry for CLI commands that need settings.
    Inputs: Optional config.yaml path; defaults to repo-root config.yaml.
    Returns: Validated AppConfig.
    Does not: Mutate the vault or call network APIs.
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
    """Copy config.example.yaml to dest if dest does not exist.

    Purpose: Bootstrap config.yaml during `jobhunt init`.
    Inputs: Destination path.
    Returns: None.
    Does not: Overwrite an existing file.
    """
    if dest.exists():
        return
    dest.write_text(EXAMPLE_CONFIG_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def _read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a YAML mapping")
    return data
