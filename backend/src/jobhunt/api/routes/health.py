"""Liveness route.

Purpose: Cheap GET /health for the frontend and local process checks.
Inputs: None.
Returns: ``{"ok": true, "status": "ok"}``.
Does not: Read the vault, config secrets, or call Gemini/Apify.
"""

from __future__ import annotations

from fastapi import APIRouter

from jobhunt.api.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return a liveness flag.

    Purpose: Confirm the API process is running.
    Inputs: None.
    Returns: ``HealthResponse(ok=True)``.
    Does not: Check Gemini, Apify, crawl policy, or vault contents.
    """

    return HealthResponse(ok=True, status="ok")
