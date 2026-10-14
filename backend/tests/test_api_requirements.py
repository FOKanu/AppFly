"""
Requirements GET/PUT API (mr1).
"""
from __future__ import annotations

from pathlib import Path
import yaml
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace

from jobhunt.api import runner
from jobhunt.api.app import create_app
import frontmatter


@pytest.fixture
def native_config(api_config, tmp_path):
    """Load api_config, set storage_backend to native and native_data_dir to tmp_path."""
    config_path = Path(api_config)
    raw = yaml.safe_load(config_path.read_text())
    raw["storage_backend"] = "native"
    raw["native_data_dir"] = str(tmp_path / "data")
    config_path.write_text(yaml.dump(raw))
    return str(config_path)


GOOD = {
    "locations": ["Berlin", "Remote"],
    "salary_floor": 60000,
    "languages": ["de", "en"],
    "banned_terms": ["rockstar"],
    "skip_companies": ["Acme"],
    "must_have": ["Python"],
    "nice_to_have": ["Rust"],
    "tone": "warm, specific"
}


def test_get_native_defaults(native_config, secret_store):
    """GET /requirements returns default values for native storage."""
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )
    response = client.get("/requirements")
    assert response.status_code == 200
    data = response.json()
    assert data["storage_backend"] == "native"
    assert data["languages"] == ["de", "en"]
    assert data["salary_floor"] == 0


def test_put_native_persists_across_restart(native_config, secret_store):
    """PUT requirements and verify they persist across app restarts."""
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )

    # PUT the good data
    response = client.put("/requirements", json=GOOD)
    assert response.status_code == 200
    body = response.json()
    assert body.pop("storage_backend") == "native"
    assert body == GOOD

    # Create a new client with the same config and check it loads the same data
    new_client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )
    response = new_client.get("/requirements")
    assert response.status_code == 200
    body = response.json()
    assert body.pop("storage_backend") == "native"
    assert body == GOOD


def test_put_normalises_lists(native_config, secret_store):
    """PUT requirements with unnormalised lists and verify they get normalised."""
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )

    # PUT data with unnormalised lists
    unnormalised = GOOD.copy()
    unnormalised["locations"] = [" Berlin ", "berlin", "", "Remote"]

    response = client.put("/requirements", json=unnormalised)
    assert response.status_code == 200

    # Check that locations are normalised (strip, drop empty, case-insensitive dedupe)
    data = response.json()
    assert data["locations"] == ["Berlin", "Remote"]


def test_put_rejects_bad_bodies(native_config, secret_store):
    """PUT bad bodies should return 422."""
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )

    # Test various bad inputs that should cause 422
    bad_inputs = [
        {"salary_floor": -1},
        {"languages": []},
        {"languages": ["  "]},
        {"tone": "a\n## Hack"},
        {"unknown": 1},
        {"locations": ["x" * 201]},
    ]

    for bad_input in bad_inputs:
        response = client.put("/requirements", json=bad_input)
        assert response.status_code == 422


def test_put_409_while_run_active(native_config, secret_store, monkeypatch):
    """PUT while a run is active should return 409."""
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )

    # Mock list_async_runs to return an active run
    def mock_list_async_runs():
        return [SimpleNamespace(id="abc", status="running")]

    monkeypatch.setattr(runner, "list_async_runs", mock_list_async_runs)

    # PUT should fail with 409
    response = client.put("/requirements", json=GOOD)
    assert response.status_code == 409
    assert "run is in progress" in response.json()["detail"]

    # Undo the patch
    monkeypatch.undo()

    # Verify that the requirements were not changed (salary_floor should still be 0)
    response = client.get("/requirements")
    assert response.status_code == 200
    data = response.json()
    assert data["salary_floor"] == 0


def test_put_requires_csrf_header(native_config, secret_store):
    """PUT without X-AppFly header should return 403."""
    # Create a client without the CSRF header
    client = TestClient(
        create_app(config_path=native_config, store=secret_store),
        base_url="http://127.0.0.1"
    )

    response = client.put("/requirements", json=GOOD)
    assert response.status_code == 403


def test_markdown_put_keeps_body_and_custom_keys(api_client, api_vault):
    """PUT to markdown backend should preserve note body and custom frontmatter keys."""
    # Create a Requirements.md file with some content
    req_file = api_vault / "Requirements.md"
    content = frontmatter.Post("# My notes\nkeep me\n", custom="yes", salary_floor=1)
    req_file.write_text(frontmatter.dumps(content))

    # PUT new requirements via the markdown client
    response = api_client.put("/requirements", json=GOOD)
    assert response.status_code == 200
    assert response.json()["storage_backend"] == "markdown"

    # Reload and verify content is preserved
    loaded = frontmatter.loads(req_file.read_text())
    assert "keep me" in loaded.content
    assert loaded.metadata["custom"] == "yes"
    assert loaded.metadata["salary_floor"] == 60000
