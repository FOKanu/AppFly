"""Settings DTOs. Secrets appear only as booleans.

Purpose: Read/write ``config.yaml`` fields the UI may edit.
Inputs: YAML-backed AppConfig values; PUT rejects unknown keys.
Returns: Paths, keywords, sources, health flags, secret *presence* flags.
Does not: Accept or return API keys, last-4 digits, or Keychain material.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ApifyPublic(BaseModel):
    """Public Apify toggle as stored in config.yaml.

    Purpose: Show whether Apify is enabled and which start URLs are listed.
    Inputs: ``sources.apify`` from AppConfig.
    Returns: ``enabled`` and ``start_urls`` only.
    Does not: Include Apify tokens or run an actor.
    """

    model_config = ConfigDict(extra="forbid")

    enabled: bool = False
    start_urls: list[str] = Field(default_factory=list)


class SourcesPublic(BaseModel):
    """Source toggles returned by GET /settings.

    Purpose: Mirror ``sources`` in config.yaml for the settings form.
    Inputs: ``AppConfig.sources``.
    Returns: agentur/inbox/rss/apify public fields.
    Does not: Include API keys.
    """

    model_config = ConfigDict(extra="forbid")

    agentur: bool
    inbox: bool
    rss: list[str] = Field(default_factory=list)
    apify: ApifyPublic = Field(default_factory=ApifyPublic)


class SecretFlags(BaseModel):
    """Whether connector keys exist in the write-only store — never the values.

    Purpose: Drive “configured / missing” UI without leaking secrets.
    Inputs: ``SecretStore.is_configured`` flags.
    Returns: Booleans named after connectors.
    Does not: Return key material, prefixes like AIza, or last-4 digits.
    """

    model_config = ConfigDict(extra="forbid")

    gemini: bool = False
    apify: bool = False
    jobsuche: bool = False


class HealthFlags(BaseModel):
    """Local workspace checks (not connector secrets).

    Purpose: Help the UI show missing vault files.
    Inputs: Filesystem paths under the configured vault.
    Returns: Existence flags only.
    Does not: Return file contents or API keys.
    """

    model_config = ConfigDict(extra="forbid")

    vault_exists: bool = False
    jobs_dir_exists: bool = False
    cv_present: bool = False
    requirements_present: bool = False
    config_file_exists: bool = False


class SettingsResponse(BaseModel):
    """GET /settings body.

    Purpose: Safe snapshot of config.yaml plus health and secret presence.
    Inputs: AppConfig + vault paths + store presence.
    Returns: Editable settings, boolean flags, and read-only run limits (letter_cap, shortlist_size, gemini_model).
    Does not: Include GEMINI_API_KEY, Apify tokens, or last-4 digits.
    """

    model_config = ConfigDict(extra="forbid")

    vault_path: str
    keywords: list[str]
    location: str
    sources: SourcesPublic
    health: HealthFlags
    secrets: SecretFlags
    # Read-only run limits from config.yaml (defaults in AppConfig); not writable via PUT /settings.
    letter_cap: int
    shortlist_size: int
    gemini_model: str


class SourcesUpdate(BaseModel):
    """Optional source toggles on PUT /settings.

    Purpose: Flip agentur/inbox and replace RSS feed URLs.
    Inputs: Partial sources object; unknown keys are rejected.
    Returns: Validated patch.
    Does not: Enable Apify actors or accept API keys.
    """

    model_config = ConfigDict(extra="forbid")

    agentur: bool | None = None
    inbox: bool | None = None
    rss: list[str] | None = None


class SettingsUpdate(BaseModel):
    """Allowed PUT /settings fields.

    Purpose: Persist vault path, keywords, location, RSS, and source toggles.
    Inputs: JSON body; extra keys (including gemini_api_key) are forbidden.
    Returns: Validated patch.
    Does not: Accept API keys (use PUT /settings/secrets/{name}).
    """

    model_config = ConfigDict(extra="forbid")

    vault_path: str | None = None
    keywords: list[str] | None = None
    location: str | None = None
    rss: list[str] | None = None
    sources: SourcesUpdate | None = None
