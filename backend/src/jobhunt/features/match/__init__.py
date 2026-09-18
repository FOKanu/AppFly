"""Local matching: hard filters plus embedding scores.

Purpose: Public API for the match feature used by the CLI.
Inputs: Imported by ``jobhunt.cli`` and ``backend/tests``.
Returns: ``match_jobs``, ``hard_filter``, ``why_match``, ``score_jobs``.
Does not: Fetch jobs, call Gemini, or change crawl policy.
"""

from jobhunt.features.match.matcher import (
    hard_filter,
    match_jobs,
    score_jobs,
    why_match,
)

__all__ = ["hard_filter", "match_jobs", "score_jobs", "why_match"]
