"""Scout → match → write orchestration used by the CLI and HTTP API.

Purpose: Namespace for pipeline helpers. Import ``run_all`` from
``jobhunt.features.pipeline.run_all`` (the module is not re-exported here so
it is not shadowed by the function of the same name).
Inputs: None at import time.
Returns: Package namespace only.
Does not: Duplicate matching, scraping, or letter generation.
"""
