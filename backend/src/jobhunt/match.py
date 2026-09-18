"""Compatibility shim. Canonical package: jobhunt.features.match.

Purpose: Keep `from jobhunt.match import match_jobs` working.
Inputs: None (re-export).
Returns: match_jobs, hard_filter, why_match, score_jobs, empty_cache_file.
Does not: Implement matching (edit features/match).
"""

from jobhunt.features.match import (
    empty_cache_file,
    hard_filter,
    match_jobs,
    score_jobs,
    why_match,
)

__all__ = [
    "empty_cache_file",
    "hard_filter",
    "match_jobs",
    "score_jobs",
    "why_match",
]
