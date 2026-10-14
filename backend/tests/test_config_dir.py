import os

import pytest

import jobhunt.config as cfg
from jobhunt.config import AppConfig


def _fake_checkout(root, with_pyproject=True, with_config=False):
    """Create a fake checkout directory structure."""
    root.mkdir(parents=True, exist_ok=True)
    if with_pyproject:
        (root / "backend" / "pyproject.toml").parent.mkdir(parents=True, exist_ok=True)
        (root / "backend" / "pyproject.toml").write_text("[project]\nname = \"fake\"\n")
    if with_config:
        config_file = root / "config.yaml"
        config_file.parent.mkdir(parents=True, exist_ok=True)
        config_file.write_text("letter_cap: 3\n")
    return root


@pytest.fixture(autouse=True)
def clear_env(monkeypatch):
    """Clear APPFLY_CONFIG_DIR before each test."""
    monkeypatch.delenv("APPFLY_CONFIG_DIR", raising=False)


@pytest.fixture
def setup_test_env(monkeypatch, tmp_path):
    """Setup the test environment with a fake checkout and example config."""
    # Set up the example config path
    monkeypatch.setattr(cfg, "EXAMPLE_CONFIG_PATH", tmp_path / "no-example.yaml")
    return tmp_path


def test_env_override(setup_test_env, monkeypatch):
    """Test that APPFLY_CONFIG_DIR env var overrides the default."""
    tmp_path = setup_test_env
    config_dir = tmp_path / "c"
    config_dir.mkdir()
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(config_dir))

    result = cfg.resolve_config_dir()
    expected = config_dir.resolve()
    assert result == expected


def test_checkout_without_config_uses_data_dir(setup_test_env, monkeypatch):
    """Test that a checkout without config uses the data directory."""
    tmp_path = setup_test_env
    repo_root = _fake_checkout(tmp_path / "repo")
    monkeypatch.setattr(cfg, "REPO_ROOT", repo_root)

    data_dir = tmp_path / "d"
    data_dir.mkdir()
    monkeypatch.setenv("APPFLY_DATA_DIR", str(data_dir))

    result = cfg.resolve_config_dir()
    expected = data_dir.resolve()
    assert result == expected


def test_checkout_with_config_is_legacy_dir(setup_test_env, monkeypatch):
    """Test that a checkout with config uses the repo root as config dir."""
    tmp_path = setup_test_env
    repo_root = _fake_checkout(tmp_path / "repo", with_config=True)
    monkeypatch.setattr(cfg, "REPO_ROOT", repo_root)

    data_dir = tmp_path / "d"
    data_dir.mkdir()
    monkeypatch.setenv("APPFLY_DATA_DIR", str(data_dir))

    result = cfg.resolve_config_dir()
    expected = repo_root
    assert result == expected


def test_site_packages_ignores_repo_config(setup_test_env, monkeypatch):
    """Test that site-packages ignores repo config."""
    tmp_path = setup_test_env
    sp_root = _fake_checkout(tmp_path / "sp", with_pyproject=False, with_config=True)
    monkeypatch.setattr(cfg, "REPO_ROOT", sp_root)

    data_dir = tmp_path / "d"
    data_dir.mkdir()
    monkeypatch.setenv("APPFLY_DATA_DIR", str(data_dir))

    result = cfg.resolve_config_dir()
    expected = data_dir.resolve()
    assert result == expected


def test_load_config_defaults_without_files(setup_test_env, monkeypatch):
    """Test that load_config returns defaults when no files exist."""
    tmp_path = setup_test_env
    repo_root = _fake_checkout(tmp_path / "repo")
    monkeypatch.setattr(cfg, "REPO_ROOT", repo_root)

    data_dir = tmp_path / "d"
    data_dir.mkdir()
    monkeypatch.setenv("APPFLY_DATA_DIR", str(data_dir))

    c = cfg.load_config()
    expected_config_path = data_dir.resolve() / "config.yaml"
    assert c.config_path == expected_config_path
    assert c.letter_cap == AppConfig().letter_cap


def test_load_env_reads_config_dir_env(setup_test_env, monkeypatch):
    """Test that load_env reads from the config directory."""
    tmp_path = setup_test_env
    config_dir = tmp_path / "c"
    config_dir.mkdir()
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(config_dir))

    env_file = config_dir / ".env"
    env_file.write_text("APPFLY_TEST_MARKER=yes\n")

    # Clear the marker if it exists
    monkeypatch.delenv("APPFLY_TEST_MARKER", raising=False)

    cfg.load_env()

    assert os.environ["APPFLY_TEST_MARKER"] == "yes"

    # Clean up
    monkeypatch.delenv("APPFLY_TEST_MARKER")


def test_put_settings_writes_config_dir(setup_test_env, monkeypatch):
    """Test that PUT /settings writes to the config directory."""
    tmp_path = setup_test_env
    config_dir = tmp_path / "c"
    config_dir.mkdir()
    monkeypatch.setenv("APPFLY_CONFIG_DIR", str(config_dir))

    repo_root = _fake_checkout(tmp_path / "repo")
    monkeypatch.setattr(cfg, "REPO_ROOT", repo_root)

    # Import here to avoid circular imports
    from jobhunt.api.app import create_app
    from jobhunt.features.secrets.keychain import MemoryKeychain
    from jobhunt.features.secrets.store import SecretStore
    from fastapi.testclient import TestClient

    app = create_app(config_path=None, store=SecretStore(MemoryKeychain()))
    client = TestClient(app, base_url="http://127.0.0.1", headers={"X-AppFly": "1"})

    r = client.put("/settings", json={"keywords": ["python"]})
    assert r.status_code == 200
    assert (tmp_path / "c" / "config.yaml").is_file()
    assert "python" in (tmp_path / "c" / "config.yaml").read_text()
