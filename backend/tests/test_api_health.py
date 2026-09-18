"""Health endpoint tests."""

from fastapi.testclient import TestClient


def test_health_ok(api_client: TestClient) -> None:
    response = api_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "status": "ok"}
