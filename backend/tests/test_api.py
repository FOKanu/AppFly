"""Health-only API checks for the A0 skeleton.

Purpose: Guard GET /health so A1 can add routes without losing liveness.
Inputs: FastAPI test client (no network).
Returns: Assertion failures if the probe leaks secrets or goes missing.
Does not: Exercise jobs, runs, or settings.
"""

from fastapi.testclient import TestClient

from jobhunt.api.app import create_app


def test_health_ok() -> None:
    client = TestClient(
        create_app(),
        base_url="http://127.0.0.1",
        headers={"X-AppFly": "1"},
    )
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "ok"
    assert "key" not in body
    assert "secret" not in body
    assert "gemini" not in body
    assert "apify" not in body
