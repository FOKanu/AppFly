"""Scout → match → write orchestration used by the CLI and HTTP API.

Purpose: Re-export ``run_all`` so callers share one pipeline.
Inputs: None at import time.
Returns: ``run_all`` and ``PipelineResult``.
Does not: Duplicate matching, scraping, or letter generation.
"""

from jobhunt.features.pipeline.run_all import PipelineResult, run_all

__all__ = ["PipelineResult", "run_all"]
