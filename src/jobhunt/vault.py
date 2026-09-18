from __future__ import annotations

import re
import shutil
import tempfile
import unicodedata
from datetime import date
from pathlib import Path
from typing import Any

import frontmatter

from jobhunt.config import TEMPLATE_DIR, AppConfig
from jobhunt.models import ACTIONABLE, Job, Requirements


VAULT_FOLDERS = (
    "CV",
    "Jobs",
    "Companies",
    "Letters",
    "Runs",
    "_inbox",
)

class Vault:
    def __init__(self, root: Path) -> None:
        self.root = root

    @property
    def jobs_dir(self) -> Path:
        return self.root / "Jobs"

    @property
    def companies_dir(self) -> Path:
        return self.root / "Companies"

    @property
    def letters_dir(self) -> Path:
        return self.root / "Letters"

    @property
    def runs_dir(self) -> Path:
        return self.root / "Runs"

    @property
    def inbox_dir(self) -> Path:
        return self.root / "_inbox"

    def ensure_dirs(self) -> None:
        for name in VAULT_FOLDERS:
            (self.root / name).mkdir(parents=True, exist_ok=True)

    def init_from_templates(self) -> list[Path]:
        created: list[Path] = []
        self.ensure_dirs()
        if not TEMPLATE_DIR.exists():
            raise FileNotFoundError(f"Missing templates at {TEMPLATE_DIR}")
        for src in TEMPLATE_DIR.rglob("*"):
            if src.is_dir() or src.name == ".gitkeep":
                continue
            rel = src.relative_to(TEMPLATE_DIR).as_posix()
            dest = self.root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                continue
            shutil.copy2(src, dest)
            created.append(dest)
        obsidian = self.root / ".obsidian"
        obsidian.mkdir(exist_ok=True)
        app_json = obsidian / "app.json"
        if not app_json.exists():
            app_json.write_text("{}\n", encoding="utf-8")
        return created

    def load_requirements(self) -> Requirements:
        path = self.root / "Requirements.md"
        if not path.exists():
            return Requirements()
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return Requirements.from_mapping(dict(post.metadata))

    def read_cv(self) -> str:
        path = self.root / "CV" / "Master.md"
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def read_voice_samples(self) -> str:
        path = self.root / "CV" / "Voice-samples.md"
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def read_company_body(self, company: str) -> str:
        path = self.company_path(company)
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def iter_job_notes(self) -> list[frontmatter.Post]:
        notes: list[frontmatter.Post] = []
        if not self.jobs_dir.exists():
            return notes
        for path in sorted(self.jobs_dir.glob("*.md")):
            if path.name.startswith("."):
                continue
            post = frontmatter.loads(path.read_text(encoding="utf-8"))
            post.metadata["_path"] = str(path)
            notes.append(post)
        return notes

    def find_job_path(self, source_id: str) -> Path | None:
        for post in self.iter_job_notes():
            if str(post.metadata.get("source_id") or "") == source_id:
                return Path(post.metadata["_path"])
        return None

    def existing_source_ids(self) -> set[str]:
        return {
            str(post.metadata.get("source_id"))
            for post in self.iter_job_notes()
            if post.metadata.get("source_id")
        }

    def company_path(self, company: str) -> Path:
        return self.companies_dir / f"{safe_filename(company)}.md"

    def company_wikilink(self, company: str) -> str:
        return f"[[Companies/{safe_filename(company)}|{company}]]"

    def upsert_job(self, job: Job, *, status: str = "inbox") -> Path:
        existing = self.find_job_path(job.source_id)
        if existing:
            post = frontmatter.loads(existing.read_text(encoding="utf-8"))
            meta = dict(post.metadata)
            current_status = str(meta.get("status") or status)
            if current_status in {"draft", "approved", "applied", "skipped"}:
                return existing
            body = _job_body(job)
            meta.update(_job_frontmatter(job, current_status, self.company_wikilink(job.company)))
            _atomic_write(existing, frontmatter.dumps(frontmatter.Post(body, **meta)))
            self.upsert_company(job)
            return existing

        path = self.jobs_dir / _job_filename(job)
        body = _job_body(job)
        meta = _job_frontmatter(job, status, self.company_wikilink(job.company))
        _atomic_write(path, frontmatter.dumps(frontmatter.Post(body, **meta)))
        self.upsert_company(job)
        return path

    def upsert_company(self, job: Job) -> Path:
        path = self.company_path(job.company)
        if path.exists():
            if job.address:
                post = frontmatter.loads(path.read_text(encoding="utf-8"))
                if "address" not in post.content.lower() and job.address:
                    post.content = post.content.rstrip() + f"\n\n## Address\n\n{job.address}\n"
                    meta = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
                    _atomic_write(path, frontmatter.dumps(frontmatter.Post(post.content, **meta)))
            return path
        meta = {"type": "company", "name": job.company, "source": job.source}
        lines = [f"# {job.company}", ""]
        if job.address:
            lines.extend(["## Address", "", job.address, ""])
        else:
            lines.extend(["Address / Impressum not yet filled.", ""])
        _atomic_write(path, frontmatter.dumps(frontmatter.Post("\n".join(lines), **meta)))
        return path

    def write_letter(self, job: Job, body: str, *, model: str, tokens_in: int, tokens_out: int) -> Path:
        today = date.today().isoformat()
        filename = f"{today}-{safe_filename(job.company)}-{safe_filename(job.title, 40)}.md"
        path = self.letters_dir / filename
        link_name = path.stem
        meta = {
            "type": "letter",
            "company": self.company_wikilink(job.company),
            "job": f"[[Jobs/{_job_stem(job)}]]",
            "source_id": job.source_id,
            "model": model,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "date": today,
        }
        _atomic_write(path, frontmatter.dumps(frontmatter.Post(body.strip() + "\n", **meta)))
        job_path = self.find_job_path(job.source_id)
        if job_path:
            post = frontmatter.loads(job_path.read_text(encoding="utf-8"))
            post.metadata["status"] = "draft"
            post.metadata["letter"] = f"[[Letters/{link_name}]]"
            post.metadata["gemini"] = True
            post.metadata["gemini_model"] = model
            post.metadata["tokens_in"] = tokens_in
            post.metadata["tokens_out"] = tokens_out
            clean = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
            _atomic_write(job_path, frontmatter.dumps(frontmatter.Post(post.content, **clean)))
        return path

    def update_job_meta(self, source_id: str, **updates: Any) -> Path | None:
        path = self.find_job_path(source_id)
        if not path:
            return None
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        post.metadata.update(updates)
        clean = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
        _atomic_write(path, frontmatter.dumps(frontmatter.Post(post.content, **clean)))
        return path

    def job_from_note(self, post: frontmatter.Post) -> Job:
        meta = post.metadata
        company = _unwrap_wikilink(str(meta.get("company") or "Unknown"))
        return Job(
            source_id=str(meta.get("source_id") or ""),
            source=str(meta.get("source") or "unknown"),
            title=str(meta.get("title") or "Untitled"),
            company=company,
            url=str(meta.get("url") or ""),
            location=str(meta.get("location") or ""),
            description=post.content,
            lang=str(meta.get("lang") or ""),
            salary=str(meta.get("salary") or ""),
            crawl_allowed=bool(meta.get("crawl", True)),
        )

    def regenerate_home(self, *, last_run: str = "") -> Path:
        rows = []
        for post in self.iter_job_notes():
            status = str(post.metadata.get("status") or "inbox")
            if status not in ACTIONABLE:
                continue
            rows.append(
                {
                    "status": status,
                    "score": post.metadata.get("score") or "",
                    "title": post.metadata.get("title") or "Untitled",
                    "company": post.metadata.get("company") or "",
                    "letter": post.metadata.get("letter") or "",
                    "path": Path(post.metadata["_path"]).stem,
                }
            )
        order = {"draft": 0, "approved": 1, "shortlist": 2}
        rows.sort(key=lambda row: (order.get(row["status"], 9), _score_sort(row["score"])))
        lines = [
            "# Job Search",
            "",
            f"Last run: {last_run or 'never'}",
            "",
            "Edit the letter, then set `status` on the job note to `approved` or `skipped`. "
            "Submit the application yourself. After that, set `status: applied` and `applied`.",
            "",
            "## Actionable",
            "",
            "| Status | Score | Title | Company | Letter |",
            "| --- | --- | --- | --- | --- |",
        ]
        if not rows:
            lines.append("| — | — | None yet | — | — |")
        else:
            for row in rows:
                title = f"[[Jobs/{row['path']}|{row['title']}]]"
                lines.append(
                    f"| {row['status']} | {row['score']} | {title} | {row['company']} | {row['letter']} |"
                )
        lines.extend(["", "## How to use", "", "- `inbox` = fetched, not scored in"])
        lines.append("- `shortlist` = matcher kept it, letter not written yet")
        lines.append("- `draft` = letter ready for you")
        lines.append("- `approved` / `applied` / `skipped` = your call")
        lines.append("")
        path = self.root / "Home.md"
        _atomic_write(path, "\n".join(lines))
        return path

    def append_run_note(self, day: str, body: str) -> Path:
        path = self.runs_dir / f"{day}.md"
        if path.exists():
            existing = path.read_text(encoding="utf-8")
            _atomic_write(path, existing.rstrip() + "\n\n" + body.strip() + "\n")
        else:
            header = f"---\ntype: run\ndate: {day}\n---\n\n# Run {day}\n\n"
            _atomic_write(path, header + body.strip() + "\n")
        return path


def init_workspace(config: AppConfig) -> Vault:
    vault = Vault(config.vault)
    vault.init_from_templates()
    return vault


def safe_filename(text: str, max_len: int = 60) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    slug = slug[:max_len].strip("-")
    return slug or "untitled"


def _job_stem(job: Job) -> str:
    return f"{job.source}-{safe_filename(job.source_id, 80)}"


def _job_filename(job: Job) -> str:
    return f"{_job_stem(job)}.md"


def _job_frontmatter(job: Job, status: str, company_link: str) -> dict[str, Any]:
    return {
        "type": "job",
        "status": status,
        "company": company_link,
        "title": job.title,
        "score": None,
        "source": job.source,
        "source_id": job.source_id,
        "url": job.url,
        "location": job.location,
        "lang": job.lang,
        "salary": job.salary,
        "letter": None,
        "gemini": True,
        "applied": None,
        "crawl": job.crawl_allowed,
    }


def _job_body(job: Job) -> str:
    lines = [f"# {job.title}", "", f"Company: {job.company}", ""]
    if job.location:
        lines.append(f"Location: {job.location}")
        lines.append("")
    if job.url:
        lines.append(f"URL: {job.url}")
        lines.append("")
    if job.description:
        lines.extend(["## Description", "", job.description.strip(), ""])
    return "\n".join(lines)


def _unwrap_wikilink(value: str) -> str:
    match = re.match(r"\[\[(?:.+\|)?(.+)\]\]", value)
    if match:
        return match.group(1)
    return value


def _score_sort(value: Any) -> float:
    try:
        return -float(value)
    except (TypeError, ValueError):
        return 0.0


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not text.endswith("\n"):
        text += "\n"
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", delete=False, dir=path.parent, prefix=".tmp-"
    ) as handle:
        handle.write(text)
        tmp = Path(handle.name)
    tmp.replace(path)
