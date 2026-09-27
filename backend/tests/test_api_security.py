"""API hardening: trusted hosts, CORS allow-list, CSRF header."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from jobhunt.api.app import create_app
from jobhunt.features.secrets.store import SecretStore

GOOD_ORIGIN = "http://localhost:5173"
EVIL_ORIGIN = "http://evil.example"
CSRF = {"X-AppFly": "1"}


@pytest.fixture
def raw_client(api_config: Path, secret_store: SecretStore) -> TestClient:
    """Test client with no default headers."""
    return TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
    )


def test_cross_origin_post_without_header_is_forbidden(raw_client: TestClient) -> None:
    """POST to /runs with evil origin and no CSRF header must be forbidden."""
    response = raw_client.post("/runs", headers={"Origin": EVIL_ORIGIN})
    assert response.status_code == 403


def test_post_without_header_is_forbidden_even_same_origin(raw_client: TestClient) -> None:
    """POST to /runs/does-not-exist/cancel without CSRF header must be forbidden."""
    response = raw_client.post("/runs/does-not-exist/cancel")
    assert response.status_code == 403


def test_post_with_header_from_evil_origin_is_forbidden(raw_client: TestClient) -> None:
    """POST to /runs/does-not-exist/cancel with evil origin and CSRF header must be forbidden."""
    response = raw_client.post(
        "/runs/does-not-exist/cancel", headers={**CSRF, "Origin": EVIL_ORIGIN}
    )
    assert response.status_code == 403


def test_post_with_header_from_allowed_origin_passes_guard(raw_client: TestClient) -> None:
    """POST to /runs/does-not-exist/cancel with good origin and CSRF header must pass."""
    response = raw_client.post(
        "/runs/does-not-exist/cancel", headers={**CSRF, "Origin": GOOD_ORIGIN}
    )
    assert response.status_code == 404


def test_post_with_header_and_no_origin_passes_guard(raw_client: TestClient) -> None:
    """POST to /runs/does-not-exist/cancel with CSRF header and no Origin must pass."""
    response = raw_client.post("/runs/does-not-exist/cancel", headers=CSRF)
    assert response.status_code == 404


def test_multipart_upload_without_header_is_forbidden(raw_client: TestClient) -> None:
    """POST to /documents with no CSRF header must be forbidden."""
    response = raw_client.post(
        "/documents", files={"file": ("cv.txt", b"hello", "text/plain")}, data={"kind": "cv"}
    )
    assert response.status_code == 403


def test_put_patch_delete_without_header_are_forbidden(raw_client: TestClient) -> None:
    """PUT, PATCH, DELETE without CSRF header must be forbidden."""
    response1 = raw_client.put("/settings", json={})
    assert response1.status_code == 403
    response2 = raw_client.patch("/jobs/x", json={"status": "skipped"})
    assert response2.status_code == 403
    response3 = raw_client.delete("/documents/x")
    assert response3.status_code == 403


def test_bad_host_header_is_rejected(raw_client: TestClient) -> None:
    """GET /health with bad Host header must be rejected."""
    response = raw_client.get("/health", headers={"Host": "evil.example"})
    assert response.status_code == 400


def test_localhost_host_is_accepted(api_config: Path, secret_store: SecretStore) -> None:
    """GET /health with localhost host must be accepted."""
    client = TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://localhost:8787",
    )
    response = client.get("/health")
    assert response.status_code == 200


def test_preflight_from_unknown_port_is_rejected(raw_client: TestClient) -> None:
    """OPTIONS to /runs with unknown port origin must be rejected."""
    response = raw_client.options(
        "/runs",
        headers={
            "Origin": "http://localhost:9999",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-appfly",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_preflight_from_dev_origin_is_allowed(raw_client: TestClient) -> None:
    """OPTIONS to /runs with dev origin must be allowed."""
    response = raw_client.options(
        "/runs",
        headers={
            "Origin": GOOD_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-appfly",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == GOOD_ORIGIN
    assert "x-appfly" in response.headers["access-control-allow-headers"].lower()


def test_preflight_from_desktop_origin_is_allowed(raw_client: TestClient) -> None:
    """OPTIONS from Neutralino shell origin (port 5174) must be allowed."""
    desktop_origin = "http://127.0.0.1:5174"
    response = raw_client.options(
        "/runs",
        headers={
            "Origin": desktop_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-appfly",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == desktop_origin


def test_get_routes_work_without_header(raw_client: TestClient) -> None:
    """GET routes must work without CSRF header."""
    response1 = raw_client.get("/health")
    assert response1.status_code == 200
    response2 = raw_client.get("/settings")
    assert response2.status_code == 200
    response3 = raw_client.get("/runs")
    assert response3.status_code == 200


def test_extra_origin_from_env(
    api_config: Path, secret_store: SecretStore, monkeypatch: pytest.MonkeyPatch
) -> None:
    """POST to /runs/does-not-exist/cancel with extra origin from env must pass."""
    monkeypatch.setenv("APPFLY_ALLOWED_ORIGINS", " app://appfly/ , ")
    client = TestClient(
        create_app(config_path=api_config, store=secret_store),
        base_url="http://127.0.0.1",
    )
    response = client.post(
        "/runs/does-not-exist/cancel", headers={**CSRF, "Origin": "app://appfly"}
    )
    assert response.status_code == 404
