"""Pydantic DTOs for the local HTTP API.

Purpose: Response/request shapes with no secret fields.
Inputs: None at import time.
Returns: Re-exported schema classes.
Does not: Include API keys, last-4 digits, or CV master text.
"""

from jobhunt.api.schemas.health import HealthResponse
from jobhunt.api.schemas.jobs import JobPacket, JobStatusPatch, JobSummary
from jobhunt.api.schemas.runs import RunLogSummary, RunResponse
from jobhunt.api.schemas.settings import SettingsResponse, SettingsUpdate

__all__ = [
    "HealthResponse",
    "JobPacket",
    "JobStatusPatch",
    "JobSummary",
    "RunLogSummary",
    "RunResponse",
    "SettingsResponse",
    "SettingsUpdate",
]
