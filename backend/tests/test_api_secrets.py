"""Secret write/delete routes — never echo values."""

from fastapi.testclient import TestClient

from jobhunt.features.secrets.store import SecretStore

FAKE_GEMINI_KEY = "AIzaSy-test-secret-key-x9Q2"


def test_put_secret_stores_without_echo(
    api_client: TestClient, secret_store: SecretStore
) -> None:
    response = api_client.put(
        "/settings/secrets/gemini",
        json={"value": FAKE_GEMINI_KEY},
    )
    assert response.status_code == 200
    assert response.json() == {"configured": True}
    assert FAKE_GEMINI_KEY not in response.text
    assert "AIza" not in response.text
    assert secret_store.is_configured("gemini") is True
    listed = api_client.get("/settings")
    assert listed.json()["secrets"]["gemini"] is True
    assert FAKE_GEMINI_KEY not in listed.text


def test_delete_secret_unsets(api_client: TestClient, secret_store: SecretStore) -> None:
    api_client.put("/settings/secrets/apify", json={"value": "apify-token-secret"})
    response = api_client.delete("/settings/secrets/apify")
    assert response.status_code == 200
    assert response.json() == {"configured": False}
    assert "apify-token-secret" not in response.text
    assert secret_store.is_configured("apify") is False


def test_unknown_secret_name(api_client: TestClient) -> None:
    response = api_client.put("/settings/secrets/openai", json={"value": "sk-nope"})
    assert response.status_code == 400
    assert "openai" in response.json()["detail"]
    assert "sk-nope" not in response.text
