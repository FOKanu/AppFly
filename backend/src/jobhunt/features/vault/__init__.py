"""Obsidian vault I/O: job notes, companies, letters, Home.md, inbox dir.

Purpose: All markdown read/write for the dedicated job-search vault.
Inputs: Vault root path and Job / metadata updates.
Returns: Paths and parsed notes.
Does not: Crawl the web, call Gemini, or live in the React app.
"""

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
    """Filesystem adapter for the Obsidian job vault.

    Purpose: Create folders, upsert job notes, and regenerate Home.md.
    Inputs: Root directory path (usually AppConfig.vault).
    Returns: Paths and parsed frontmatter notes.
    Does not: Fetch listing URLs or send HTTP.
    """

    def __init__(self, root: Path) -> None:
        self.root = root

    @property
    def jobs_dir(self) -> Path:
        """Jobs/ folder under the vault root.

        Purpose: Store one markdown note per listing.
        Inputs: None.
        Returns: Path, which may not exist yet.
        Does not: Create the folder.
        """
        return self.root / "Jobs"

    @property
    def companies_dir(self) -> Path:
        """Companies/ folder under the vault root.

        Purpose: Store one company note per employer.
        Inputs: None.
        Returns: Path.
        Does not: Create the folder.
        """
        return self.root / "Companies"

    @property
    def letters_dir(self) -> Path:
        """Letters/ folder under the vault root.

        Purpose: Store drafted cover letters.
        Inputs: None.
        Returns: Path.
        Does not: Create the folder.
        """
        return self.root / "Letters"

    @property
    def runs_dir(self) -> Path:
        """Runs/ folder under the vault root.

        Purpose: Store daily run logs.
        Inputs: None.
        Returns: Path.
        Does not: Create the folder.
        """
        return self.root / "Runs"

    @property
    def inbox_dir(self) -> Path:
        """_inbox/ folder for Web Clipper notes.

        Purpose: Local-only ingest path used by scout.inbox.
        Inputs: None.
        Returns: Path.
        Does not: Fetch clip URLs.
        """
        return self.root / "_inbox"

    def ensure_dirs(self) -> None:
        """Create the standard vault folders if missing.

        Purpose: Idempotent layout for init and scout.
        Inputs: None (uses self.root).
        Returns: None.
        Does not: Overwrite notes.
        """
        for name in VAULT_FOLDERS:
            (self.root / name).mkdir(parents=True, exist_ok=True)

    def init_from_templates(self) -> list[Path]:
        """Copy vault-templates into an empty or partial vault.

        Purpose: Seed CV, Requirements, Home, and inbox README.
        Inputs: TEMPLATE_DIR at the repo root.
        Returns: Paths of files that were newly copied.
        Does not: Overwrite existing notes.
        """
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
        """Parse Requirements.md frontmatter.

        Purpose: Supply match and write with hard filters and tone.
        Inputs: None (reads vault root).
        Returns: Requirements, or defaults if the file is missing.
        Does not: Fetch URLs.
        """
        path = self.root / "Requirements.md"
        if not path.exists():
            return Requirements()
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return Requirements.from_mapping(dict(post.metadata))

    def read_cv(self) -> str:
        """Read CV/Master.md body text.

        Purpose: Local CV slice source for match and write.
        Inputs: None.
        Returns: Markdown body, or empty string if missing.
        Does not: Send the CV to a remote API by itself.
        """
        path = self.root / "CV" / "Master.md"
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def read_voice_samples(self) -> str:
        """Read CV/Voice-samples.md body text.

        Purpose: Style examples for the sealed writer packet.
        Inputs: None.
        Returns: Markdown body, or empty string if missing.
        Does not: Call Gemini.
        """
        path = self.root / "CV" / "Voice-samples.md"
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def read_company_body(self, company: str) -> str:
        """Read the company note body if it exists.

        Purpose: Optional company context for the writer packet.
        Inputs: Company display name.
        Returns: Markdown body or empty string.
        Does not: Scrape Impressum pages.
        """
        path = self.company_path(company)
        if not path.exists():
            return ""
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        return post.content.strip()

    def iter_job_notes(self) -> list[frontmatter.Post]:
        """Load every Jobs/*.md note with `_path` in metadata.

        Purpose: Shared iterator for match, write, and Home.md.
        Inputs: None.
        Returns: List of frontmatter posts, sorted by path.
        Does not: Change status fields.
        """
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
        """Locate the markdown file for a source_id.

        Purpose: Idempotent upsert and metadata updates.
        Inputs: Scout source_id string.
        Returns: Path or None.
        Does not: Create a note.
        """
        for post in self.iter_job_notes():
            if str(post.metadata.get("source_id") or "") == source_id:
                return Path(post.metadata["_path"])
        return None

    def existing_source_ids(self) -> set[str]:
        """Set of source_ids already stored in Jobs/.

        Purpose: Let scout skip duplicates.
        Inputs: None.
        Returns: Set of non-empty source_id strings.
        Does not: Fetch new listings.
        """
        return {
            str(post.metadata.get("source_id"))
            for post in self.iter_job_notes()
            if post.metadata.get("source_id")
        }

    def company_path(self, company: str) -> Path:
        """Path of the company note for this name.

        Purpose: Stable filename for Companies/.
        Inputs: Company display name.
        Returns: Path under companies_dir.
        Does not: Write the file.
        """
        return self.companies_dir / f"{safe_filename(company)}.md"

    def company_wikilink(self, company: str) -> str:
        """Obsidian wikilink to the company note.

        Purpose: Frontmatter `company` field on job notes.
        Inputs: Company display name.
        Returns: `[[Companies/slug|Name]]` string.
        Does not: Create the note.
        """
        return f"[[Companies/{safe_filename(company)}|{company}]]"

    def upsert_job(self, job: Job, *, status: str = "inbox") -> Path:
        """Create or refresh a job note without clobbering draft-and-later statuses.

        Purpose: Persist scout results.
        Inputs: Job and optional initial status.
        Returns: Path of the job markdown file.
        Does not: Crawl the job URL.
        """
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
        """Create a company note, appending address when the file already exists.

        Purpose: Keep employer files next to jobs.
        Inputs: Job (company, address, source).
        Returns: Path of the company markdown file.
        Does not: Fetch Impressum pages.
        """
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
        """Store a letter and mark the job as draft.

        Purpose: Persist Gemini output and link it from the job note.
        Inputs: Job, letter markdown, model name, token counts.
        Returns: Path of the letter file.
        Does not: Submit the application.
        """
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
        """Merge key/value updates into a job note's frontmatter.

        Purpose: Matcher status/score writes and writer token fields.
        Inputs: source_id and keyword metadata updates.
        Returns: Path or None if the job is missing.
        Does not: Rewrite the description body.
        """
        path = self.find_job_path(source_id)
        if not path:
            return None
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        post.metadata.update(updates)
        clean = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
        _atomic_write(path, frontmatter.dumps(frontmatter.Post(post.content, **clean)))
        return path

    def job_from_note(self, post: frontmatter.Post) -> Job:
        """Rebuild a Job from a parsed job note.

        Purpose: Feed match and write from disk.
        Inputs: frontmatter.Post with metadata and content.
        Returns: Job dataclass.
        Does not: Fetch the listing URL.
        """
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
        """Rewrite Home.md with actionable jobs.

        Purpose: Morning table of shortlist/draft/approved notes.
        Inputs: Optional last_run timestamp string.
        Returns: Path of Home.md.
        Does not: Change job statuses.
        """
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
        """Append a run section to Runs/YYYY-MM-DD.md.

        Purpose: Keep a daily log for `jobhunt run`.
        Inputs: ISO date string and markdown body.
        Returns: Path of the run note.
        Does not: Call scout/match/write itself.
        """
        path = self.runs_dir / f"{day}.md"
        if path.exists():
            existing = path.read_text(encoding="utf-8")
            _atomic_write(path, existing.rstrip() + "\n\n" + body.strip() + "\n")
        else:
            header = f"---\ntype: run\ndate: {day}\n---\n\n# Run {day}\n\n"
            _atomic_write(path, header + body.strip() + "\n")
        return path


def init_workspace(config: AppConfig) -> Vault:
    """Create vault folders and copy templates.

    Purpose: `jobhunt init` workspace bootstrap.
    Inputs: AppConfig with vault path.
    Returns: Vault bound to that path.
    Does not: Fetch jobs.
    """
    vault = Vault(config.vault)
    vault.init_from_templates()
    return vault


def safe_filename(text: str, max_len: int = 60) -> str:
    """ASCII slug for vault filenames.

    Purpose: Stable, filesystem-safe names for jobs and companies.
    Inputs: Display text and optional max length.
    Returns: Lowercase hyphenated slug, or "untitled".
    Does not: Write a file.
    """
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
