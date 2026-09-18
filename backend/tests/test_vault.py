from pathlib import Path

from jobhunt.models import Job
from jobhunt.vault import Vault


def _job(source_id: str = "ref-1") -> Job:
    return Job(
        source_id=source_id,
        source="agentur",
        title="Software Engineer",
        company="SAP",
        url="https://example.com/job",
        location="Berlin",
        description="Build things.",
    )


def test_upsert_is_idempotent(tmp_path: Path) -> None:
    vault = Vault(tmp_path)
    vault.ensure_dirs()
    first = vault.upsert_job(_job())
    second = vault.upsert_job(_job())
    assert first == second
    assert len(list((tmp_path / "Jobs").glob("*.md"))) == 1
    assert (tmp_path / "Companies" / "sap.md").exists()


def test_does_not_clobber_draft(tmp_path: Path) -> None:
    vault = Vault(tmp_path)
    vault.ensure_dirs()
    path = vault.upsert_job(_job())
    vault.update_job_meta("ref-1", status="draft")
    vault.upsert_job(
        Job(
            source_id="ref-1",
            source="agentur",
            title="Changed",
            company="SAP",
            description="new",
        )
    )
    text = path.read_text(encoding="utf-8")
    assert "status: draft" in text
    assert "Changed" not in text


def test_vault_marks_denied_listing_not_crawlable(tmp_path: Path) -> None:
    from jobhunt.policy import apply_crawl_policy

    vault = Vault(tmp_path)
    vault.ensure_dirs()
    job = apply_crawl_policy(
        Job(
            source_id="li-1",
            source="inbox",
            title="Role",
            company="Acme",
            url="https://www.linkedin.com/jobs/view/1",
        )
    )
    path = vault.upsert_job(job)
    text = path.read_text(encoding="utf-8")
    assert "crawl: false" in text or "crawl: False" in text
