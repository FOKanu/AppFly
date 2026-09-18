"""Phase 1 local API contract stub (HTTP server not started here).

Purpose: Give later agents a single module for /health and the documented routes.
Inputs: None for health().
Returns: JSON-ready dicts.
Does not: Bind a port, read the vault, call Gemini/Apify, or return secret values.
"""


def health() -> dict[str, str]:
    """Liveness payload for GET /health.

    Purpose: Optional stub until a local HTTP server exists.
    Inputs: None.
    Returns: {"status": "ok"}.
    Does not: Check disk, config, or API keys.
    """
    return {"status": "ok"}
