"""Health-check DTO.

Purpose: Tiny liveness payload for the frontend and process supervisors.
Inputs: Built by the health route.
Returns: ``ok`` boolean only.
Does not: Include vault contents or connector secrets.
"""

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Liveness body for GET /health.

    Purpose: Tell the UI the API process is up.
    Inputs: ``ok`` is always True when the route runs.
    Returns: JSON ``{"ok": true}``.
    Does not: Probe Gemini, Apify, or the job boards.
    """

    model_config = ConfigDict(extra="forbid")

    ok: bool = Field(description="True when the API process answered.")
