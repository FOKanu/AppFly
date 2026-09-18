"""``python -m jobhunt`` entry.

Purpose: Delegate to the Typer CLI.
Inputs: Process argv.
Returns: None; runs ``jobhunt.cli.app``.
Does not: Add extra commands.
"""

from jobhunt.cli import app

if __name__ == "__main__":
    app()
