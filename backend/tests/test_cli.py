"""Smoke tests for CLI commands and repo-root paths after the monorepo split.

Purpose: Confirm the console script surface and template paths still resolve.
Inputs: Typer runner; ``jobhunt.config`` path constants.
Returns: Assertion failures if commands vanish or templates are looked up under backend/.
Does not: Run scout against the network.
"""

from pathlib import Path

from typer.testing import CliRunner

from jobhunt.cli import app
from jobhunt.config import EXAMPLE_CONFIG_PATH, REPO_ROOT, TEMPLATE_DIR


def test_cli_lists_pipeline_commands() -> None:
    result = CliRunner().invoke(app, ["--help"])
    assert result.exit_code == 0
    for name in ("init", "scout", "match", "write", "run"):
        assert name in result.stdout


def test_repo_root_still_holds_templates_and_example_config() -> None:
    assert REPO_ROOT.name != "backend"
    assert EXAMPLE_CONFIG_PATH.is_file()
    assert (TEMPLATE_DIR / "Requirements.md").is_file()
    assert (TEMPLATE_DIR / "Home.md").is_file()
    assert (Path(REPO_ROOT) / "backend" / "pyproject.toml").is_file()
