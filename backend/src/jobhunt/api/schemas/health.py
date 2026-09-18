"""Health-check DTO.

Purpose: Tiny liveness payload for the frontend and process supervisors.
Inputs: Built by the health route.
Returns: ``ok`` and ``status`` (no secrets).
Does not: Include vault contents or connector secrets.
"""

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    """Liveness body for GET /health.

    Purpose: Tell the UI the API process is up.
    Inputs: ``ok`` is always True when the route runs.
    Returns: JSON ``{"ok": true, "status": "ok"}``.
    Does not: Probe Gemini, Apify, or the job boards.
    """

    model_config = ConfigDict(extra="forbid")

    ok: bool = Field(description="True when the API process answered.")
    status: str = Field(default="ok", description="Stable liveness string from the A0 contract.")
