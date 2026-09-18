"""Secret route stubs."""

from fastapi.testclient import TestClient

FAKE_GEMINI_KEY = "AIzaSy-test-secret-key-x9Q2"


def test_put_secret_stub(api_client: TestClient) -> None:
    response = api_client.put(
        "/settings/secrets/gemini",
        json={"value": FAKE_GEMINI_KEY},
    )
    assert response.status_code == 501
    assert response.json()["detail"] == "implemented by secrets feature"
    assert FAKE_GEMINI_KEY not in response.text
    assert "AIza" not in response.text


def test_delete_secret_stub(api_client: TestClient) -> None:
    response = api_client.delete("/settings/secrets/apify")
    assert response.status_code == 501
    assert response.json()["detail"] == "implemented by secrets feature"


def test_unknown_secret_name(api_client: TestClient) -> None:
    response = api_client.put("/settings/secrets/jobsuche", json={"value": "x"})
    assert response.status_code == 400
