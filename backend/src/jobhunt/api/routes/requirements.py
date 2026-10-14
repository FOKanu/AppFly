"""
Requirements API routes.

Purpose: Manage job search requirements including locations, languages, salary expectations,
and other filters.
Inputs: HTTP requests with JSON body for PUT operations.
Returns: Requirements data model with storage backend information.
Does not: Modify the underlying storage directly - uses store methods.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator

from jobhunt.api import runner
from jobhunt.api.app import get_app_store, get_config
from jobhunt.models import Requirements

router = APIRouter(tags=["requirements"])

# Constants - matching BRIEF specification
MAX_LOCATIONS = 20
MAX_LANGUAGES = 6
MAX_BANNED_TERMS = 50
MAX_SKIP_COMPANIES = 200
MAX_MUST_HAVE = 10
MAX_NICE_TO_HAVE = 30
MAX_TONE_LEN = 200
MAX_ITEM_LEN = 80


def _clean_list(values: list[str], max_items: int, field_name: str) -> list[str]:
    """Clean a list of strings by stripping, removing empties, deduplicating case-insensitively."""
    # Strip each item and filter out empty strings
    cleaned = [v.strip() for v in values if v.strip()]

    # Check length limits for each item
    for item in cleaned:
        if len(item) > MAX_ITEM_LEN:
            raise ValueError(f"Item '{item}' exceeds maximum length of {MAX_ITEM_LEN}")
        # Check for control characters
        if any(ord(c) < 32 for c in item):
            raise ValueError(f"Item '{item}' contains control character")

    # Deduplicate case-insensitively, keeping first occurrence
    seen = set()
    result = []
    for item in cleaned:
        lower_item = item.lower()
        if lower_item not in seen:
            seen.add(lower_item)
            result.append(item)

    # Check item count limit
    if len(result) > max_items:
        raise ValueError(f"Too many {field_name}: {len(result)} exceeds maximum of {max_items}")

    return result


class RequirementsBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locations: list[str] = Field(default_factory=list)
    salary_floor: int = Field(default=0, ge=0, le=1_000_000)
    languages: list[str] = Field(default_factory=lambda: ["de", "en"])
    banned_terms: list[str] = Field(default_factory=list)
    skip_companies: list[str] = Field(default_factory=list)
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    tone: str = Field(default="concise, specific, no buzzword salad", max_length=MAX_TONE_LEN)

    @field_validator("locations")
    @classmethod
    def validate_locations(cls, v: list[str]) -> list[str]:
        return _clean_list(v, MAX_LOCATIONS, "locations")

    @field_validator("languages")
    @classmethod
    def validate_languages(cls, v: list[str]) -> list[str]:
        # Check max items for languages first
        if len(v) > MAX_LANGUAGES:
            raise ValueError(f"Too many languages: {len(v)} exceeds maximum of {MAX_LANGUAGES}")
        cleaned = _clean_list(v, MAX_LANGUAGES, "languages")
        if not cleaned:
            raise ValueError("languages must not be empty")
        return cleaned

    @field_validator("banned_terms")
    @classmethod
    def validate_banned_terms(cls, v: list[str]) -> list[str]:
        return _clean_list(v, MAX_BANNED_TERMS, "banned_terms")

    @field_validator("skip_companies")
    @classmethod
    def validate_skip_companies(cls, v: list[str]) -> list[str]:
        return _clean_list(v, MAX_SKIP_COMPANIES, "skip_companies")

    @field_validator("must_have")
    @classmethod
    def validate_must_have(cls, v: list[str]) -> list[str]:
        return _clean_list(v, MAX_MUST_HAVE, "must_have")

    @field_validator("nice_to_have")
    @classmethod
    def validate_nice_to_have(cls, v: list[str]) -> list[str]:
        return _clean_list(v, MAX_NICE_TO_HAVE, "nice_to_have")

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        v = v.strip()
        if "\n" in v or "\r" in v:
            raise ValueError("tone must be one line")
        return v


class RequirementsOut(BaseModel):
    model_config = ConfigDict(extra="forbid")
    locations: list[str]
    salary_floor: int
    languages: list[str]
    banned_terms: list[str]
    skip_companies: list[str]
    must_have: list[str]
    nice_to_have: list[str]
    tone: str
    storage_backend: str


def _out(request: Request) -> RequirementsOut:
    """Get requirements output with storage backend info."""
    store = get_app_store(request)
    data = asdict(store.load_requirements())
    return RequirementsOut(
        storage_backend=getattr(store, "backend_name", get_config(request).storage_backend),
        **data
    )


def _out_for_response(request: Request) -> dict:
    """Get requirements output without storage_backend for clean response."""
    result = _out(request)
    # Convert to dict and remove storage_backend for clean comparison
    data = result.model_dump()
    data.pop("storage_backend", None)
    return data


def _active_run_id(request: Request) -> str | None:
    """Check if there's an active run and return its ID if found."""
    # Check in-memory runs
    for rec in runner.list_async_runs():
        if rec.status in runner.ACTIVE_STATUSES:
            return rec.id

    # Check store for stale runs
    store = get_app_store(request)
    settle = getattr(store, "settle_stale_active_runs", None)
    if callable(settle):
        settle()

    find = getattr(store, "find_active_run", None)
    if callable(find):
        active = find()
        if active is not None:
            return active.id

    return None


@router.get("/requirements", response_model=RequirementsOut)
def get_requirements(request: Request) -> RequirementsOut:
    """Get current requirements."""
    return _out(request)


@router.put("/requirements", response_model=RequirementsOut)
def put_requirements(body: RequirementsBody, request: Request) -> RequirementsOut:
    """Update requirements."""
    if _active_run_id(request):
        raise HTTPException(
            status_code=409,
            detail="A run is in progress. Save again when it finishes."
        )

    get_app_store(request).save_requirements(Requirements(**body.model_dump()))
    return _out(request)
