from pathlib import Path

from jobhunt.config import AppConfig
from jobhunt.models import Job, Requirements
from jobhunt.features.scout import collect_jobs
from jobhunt.vault import Vault


def test_collect_skips_existing_and_banned_company(tmp_path: Path) -> None:
    vault = Vault(tmp_path)
    vault.ensure_dirs()
    vault.upsert_job(
        Job(source_id="existing", source="inbox", title="Old", company="Keep")
    )
    inbox = tmp_path / "_inbox"
    (inbox / "new.md").write_text(
        "---\ncompany: FreshCo\nurl: https://example.com/new\n---\n\n# New Role\n",
        encoding="utf-8",
    )
    (inbox / "dup.md").write_text(
        "---\ncompany: Keep\nsource_id: existing\nurl: https://example.com/old\n---\n\n# Dup\n",
        encoding="utf-8",
    )
    (inbox / "agency.md").write_text(
        "---\ncompany: Evil Staffing\nurl: https://example.com/agency\n---\n\n# Temp\n",
        encoding="utf-8",
    )

    cfg = AppConfig(vault_path=tmp_path)
    cfg.sources.agentur = False
    cfg.sources.inbox = True
    cfg.sources.rss = []

    jobs = collect_jobs(
        cfg,
        vault,
        Requirements(skip_companies=["Evil Staffing"]),
    )
    ids = {job.source_id for job in jobs}
    assert "existing" not in ids
    assert any(job.company == "FreshCo" for job in jobs)
    assert all(job.company != "Evil Staffing" for job in jobs)
