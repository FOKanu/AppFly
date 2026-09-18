from pathlib import Path

from jobhunt.features.scout.inbox import fetch_inbox_jobs


def test_inbox_parses_markdown_clip(tmp_path: Path) -> None:
    clip = tmp_path / "role.md"
    clip.write_text(
        "---\ncompany: Zeiss\nurl: https://example.com/jobs/1\n---\n\n# Optics Engineer\n\nNice role.\n",
        encoding="utf-8",
    )
    jobs = fetch_inbox_jobs(tmp_path)
    assert len(jobs) == 1
    assert jobs[0].company == "Zeiss"
    assert jobs[0].title == "Optics Engineer"
    assert jobs[0].url == "https://example.com/jobs/1"
    assert jobs[0].source == "inbox"
