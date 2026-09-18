"""Jobs list, packet, and status-patch tests against a temp vault."""

from pathlib import Path

from fastapi.testclient import TestClient

from jobhunt.models import Job
from jobhunt.vault import Vault


def _seed_job(api_vault: Path, source_id: str = "ref-1", *, status: str = "inbox") -> Vault:
    vault = Vault(api_vault)
    vault.ensure_dirs()
    vault.upsert_job(
        Job(
            source_id=source_id,
            source="inbox",
            title="Software Engineer",
            company="SAP",
            url="https://example.com/job",
            location="Berlin",
            description="Build Python APIs for internal tools.",
        ),
        status=status,
    )
    return vault


def test_list_jobs_from_temp_vault(api_client: TestClient, api_vault: Path) -> None:
    _seed_job(api_vault)
    response = api_client.get("/jobs")
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    row = rows[0]
    assert row["source_id"] == "ref-1"
    assert row["title"] == "Software Engineer"
    assert row["company"] == "SAP"
    assert row["status"] == "inbox"
    assert "Build Python APIs" not in response.text
    assert "Master.md" not in response.text


def test_list_jobs_status_filter(api_client: TestClient, api_vault: Path) -> None:
    _seed_job(api_vault, "keep", status="shortlist")
    _seed_job(api_vault, "drop", status="inbox")
    response = api_client.get("/jobs", params={"status": "shortlist"})
    assert response.status_code == 200
    ids = {row["source_id"] for row in response.json()}
    assert ids == {"keep"}


def test_list_jobs_rejects_unknown_status(api_client: TestClient) -> None:
    response = api_client.get("/jobs", params={"status": "nope"})
    assert response.status_code == 422


def test_get_job_packet_includes_letter_excerpt_not_cv(
    api_client: TestClient, api_vault: Path
) -> None:
    vault = _seed_job(api_vault, "ref-1", status="shortlist")
    vault.write_letter(
        Job(
            source_id="ref-1",
            source="inbox",
            title="Software Engineer",
            company="SAP",
            url="https://example.com/job",
            location="Berlin",
            description="Build Python APIs for internal tools.",
        ),
        "Dear hiring team,\n\nI would like to apply for Software Engineer at SAP.\n",
        model="test-model",
        tokens_in=1,
        tokens_out=1,
    )
    (vault.root / "CV" / "Master.md").write_text(
        "SECRET_CV_MASTER_SHOULD_NOT_APPEAR\n",
        encoding="utf-8",
    )
    response = api_client.get("/jobs/ref-1")
    assert response.status_code == 200
    packet = response.json()
    assert packet["source_id"] == "ref-1"
    assert packet["status"] == "draft"
    assert packet["has_letter"] is True
    assert "I would like to apply" in (packet["letter_excerpt"] or "")
    assert "SECRET_CV_MASTER_SHOULD_NOT_APPEAR" not in response.text
    assert packet["description_excerpt"]


def test_get_job_missing_404(api_client: TestClient) -> None:
    response = api_client.get("/jobs/missing-id")
    assert response.status_code == 404


def test_patch_job_status(api_client: TestClient, api_vault: Path) -> None:
    _seed_job(api_vault, "ref-1")
    response = api_client.patch("/jobs/ref-1", json={"status": "approved"})
    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    listed = api_client.get("/jobs", params={"status": "approved"})
    assert listed.json()[0]["source_id"] == "ref-1"


def test_patch_job_rejects_unknown_status(api_client: TestClient, api_vault: Path) -> None:
    _seed_job(api_vault)
    response = api_client.patch("/jobs/ref-1", json={"status": "emailed"})
    assert response.status_code == 422


def test_patch_job_rejects_extra_keys(api_client: TestClient, api_vault: Path) -> None:
    _seed_job(api_vault)
    response = api_client.patch(
        "/jobs/ref-1",
        json={"status": "skipped", "gemini_api_key": "AIzaSy-should-reject"},
    )
    assert response.status_code == 422
    assert "AIzaSy-should-reject" not in api_client.get("/jobs/ref-1").text
