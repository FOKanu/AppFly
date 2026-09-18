"""Run the local Jobhunt HTTP API.

Purpose: Bind FastAPI on loopback for the UI (Phase 1).
Inputs: Process argv (none required).
Returns: None; runs uvicorn until stopped.
Does not: Expose the server on 0.0.0.0 or print API keys.
"""

from __future__ import annotations

import uvicorn

from jobhunt.api.app import create_app


def main() -> None:
    """Start uvicorn on 127.0.0.1:8787.

    Purpose: One command to serve the UI's backend.
    Inputs: None.
    Returns: None.
    Does not: Open a public bind address.
    """

    uvicorn.run(create_app(), host="127.0.0.1", port=8787)


if __name__ == "__main__":
    main()
