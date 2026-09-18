"""Layout and compatibility checks after the backend/ move.

Purpose: Lock repo-root discovery, the health stub, and scout shims.
Inputs: Installed jobhunt package and repo files.
Returns: Assertions for pytest.
Does not: Call Gemini, Apify, or the Jobsuche API.
"""

from jobhunt.api import health
from jobhunt.config import EXAMPLE_CONFIG_PATH, REPO_ROOT, TEMPLATE_DIR
from jobhunt.features.scout import collect_jobs as feature_collect
from jobhunt.scout import collect_jobs as shim_collect


def test_repo_root_finds_templates_and_example_config() -> None:
    assert (REPO_ROOT / "vault-templates").is_dir()
    assert TEMPLATE_DIR == REPO_ROOT / "vault-templates"
    assert EXAMPLE_CONFIG_PATH.is_file()
    assert EXAMPLE_CONFIG_PATH == REPO_ROOT / "config.example.yaml"


def test_health_stub() -> None:
    assert health() == {"status": "ok"}


def test_scout_shim_is_canonical_collect_jobs() -> None:
    assert shim_collect is feature_collect
