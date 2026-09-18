"""Allow `python -m jobhunt`.

Purpose: Delegate to the Typer CLI app.
Inputs: Process argv.
Returns: None (exits via Typer).
Does not: Implement scout/match/write logic.
"""

from jobhunt.cli import app

if __name__ == "__main__":
    app()
