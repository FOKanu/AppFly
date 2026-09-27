"""Native SQLite + filesystem implementation of AppStore.

Purpose: Local-first workspace without Obsidian markdown notes.
Inputs: Data root path (Application Support / XDG).
Returns: ``SqliteStore`` methods for jobs, letters, documents, and runs.
Does not: Crawl deny-listed hosts or store API keys in SQLite.
"""

from __future__ import annotations

import json
import re
import shutil
import sqlite3
import threading
import uuid
from datetime import date
from pathlib import Path
from typing import Any

from jobhunt.models import ACTIONABLE, Job, Requirements
from jobhunt.store.paths import ensure_native_layout, sqlite_path
from jobhunt.store.sqlite.schema import migrate
from jobhunt.store.types import DocumentKind, DocumentMeta, JobNote, LetterRecord, RunRecord, utc_now
from jobhunt.vault import safe_filename

_PROTECTED_STATUSES = frozenset({"draft", "approved", "applied", "skipped"})
HEARTBEAT_STALE_SECONDS = 60

_JOB_COLUMNS = frozenset(
    {
        "source",
        "title",
        "company",
        "status",
        "url",
        "location",
        "description",
        "lang",
        "salary",
        "score",
        "crawl_allowed",
        "letter_path",
        "gemini",
        "skip_reason",
        "why_match",
    }
)


class _Rows:
    """Materialized query result (rows fetched while the store lock was held)."""

    def __init__(self, rows: list[sqlite3.Row]) -> None:
        self._rows = rows

    def fetchall(self) -> list[sqlite3.Row]:
        return list(self._rows)

    def fetchone(self) -> sqlite3.Row | None:
        return self._rows[0] if self._rows else None

    def __iter__(self):
        return iter(self._rows)


class _LockedConnection:
    """Serialize every use of one sqlite3 connection across threads.

    Purpose: FastAPI worker threads and the background run thread share one store.
    Inputs: An open ``sqlite3.Connection`` and a ``threading.RLock``.
    Returns: ``execute`` results as ``_Rows``; ``commit`` / ``rollback`` / ``close``.
    Does not: Make multi-statement sequences atomic across threads.
    """

    def __init__(self, conn: sqlite3.Connection, lock: threading.RLock) -> None:
        self._conn = conn
        self._lock = lock

    def execute(self, sql: str, params: Any = ()) -> _Rows:
        with self._lock:
            cursor = self._conn.execute(sql, params)
            return _Rows(cursor.fetchall())

    def commit(self) -> None:
        with self._lock:
            self._conn.commit()

    def rollback(self) -> None:
        with self._lock:
            self._conn.rollback()

    def close(self) -> None:
        with self._lock:
            self._conn.close()


class SqliteStore:
    """AppStore backed by ``appfly.sqlite`` and files under the data root.

    Purpose: Default ``storage_backend: native`` persistence.
    Inputs: Optional data root; opens SQLite and runs migrations.
    Returns: Store protocol methods.
    Does not: Dual-write to an Obsidian vault.
    """

    backend_name = "native"

    def __init__(self, root: Path | None = None) -> None:
        self._root = ensure_native_layout(root)
        self._db_path = sqlite_path(self._root)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        raw = sqlite3.connect(self._db_path, check_same_thread=False, timeout=5.0)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA journal_mode=WAL")
        raw.execute("PRAGMA busy_timeout=5000")
        migrate(raw)
        self._conn = _LockedConnection(raw, self._lock)

    def ensure_dirs(self) -> None:
        """Create native layout directories under the data root.

        Purpose: First-run setup for files/ and imports/.
        Inputs: None.
        Returns: None.
        Does not: Reset SQLite or delete user data.
        """

        ensure_native_layout(self._root)
        (self._root / "files" / "runs").mkdir(parents=True, exist_ok=True)
        (self._root / "files" / "jobs").mkdir(parents=True, exist_ok=True)

    def data_path(self) -> Path:
        """Return the AppFly data root.

        Purpose: Expose workspace path to API and import reports.
        Inputs: None.
        Returns: Resolved data directory.
        Does not: Create missing directories.
        """

        return self._root

    @property
    def inbox_dir(self) -> Path:
        """Directory for clipped inbox markdown files.

        Purpose: Pipeline-compatible inbox path (``files/inbox``).
        Inputs: None.
        Returns: Path under the data root.
        Does not: Scan or parse inbox files.
        """

        return self._root / "files" / "inbox"

    def existing_source_ids(self) -> set[str]:
        """Collect all job ``source_id`` values in the database.

        Purpose: Scout deduplication before upsert.
        Inputs: None.
        Returns: Set of non-empty source ids.
        Does not: Filter by status.
        """

        rows = self._conn.execute("SELECT source_id FROM jobs").fetchall()
        return {str(row["source_id"]) for row in rows if row["source_id"]}

    def upsert_job(self, job: Job, *, status: str = "inbox") -> Path:
        """Insert or update one job row and company page.

        Purpose: Persist a listing from scout or import.
        Inputs: ``Job`` and initial ``status``.
        Returns: Logical job note path under ``files/jobs/``.
        Does not: Overwrite draft/approved/applied/skipped rows.
        """

        self.ensure_dirs()
        path = self._job_path(job.source_id, job.source)
        row = self._conn.execute(
            "SELECT status FROM jobs WHERE source_id = ?",
            (job.source_id,),
        ).fetchone()
        if row is not None:
            current = str(row["status"] or status)
            if current in _PROTECTED_STATUSES:
                return path
            status = current if current else status

        now = utc_now()
        extra = dict(job.extra) if job.extra else {}
        self._conn.execute(
            """
            INSERT INTO jobs (
                source_id, source, title, company, status, url, location,
                description, lang, salary, crawl_allowed, extra_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                source = excluded.source,
                title = excluded.title,
                company = excluded.company,
                status = excluded.status,
                url = excluded.url,
                location = excluded.location,
                description = excluded.description,
                lang = excluded.lang,
                salary = excluded.salary,
                crawl_allowed = excluded.crawl_allowed,
                extra_json = excluded.extra_json,
                updated_at = excluded.updated_at
            """,
            (
                job.source_id,
                job.source,
                job.title,
                job.company,
                status,
                job.url,
                job.location,
                job.description,
                job.lang,
                job.salary,
                1 if job.crawl_allowed else 0,
                json.dumps(extra),
                now,
            ),
        )
        self._upsert_company(job)
        self._conn.commit()
        return path

    def iter_job_notes(self) -> list[JobNote]:
        """Load all jobs as vault-compatible notes.

        Purpose: Match and write pipelines read frontmatter-shaped metadata.
        Inputs: None.
        Returns: ``JobNote`` list ordered by source_id.
        Does not: Include jobs without a source_id.
        """

        rows = self._conn.execute(
            "SELECT * FROM jobs ORDER BY source_id"
        ).fetchall()
        notes: list[JobNote] = []
        for row in rows:
            meta = self._job_row_to_metadata(row)
            notes.append(JobNote(metadata=meta, content=str(row["description"] or "")))
        return notes

    def job_from_note(self, post: JobNote) -> Job:
        """Build a ``Job`` from store metadata and body.

        Purpose: Same shape as ``Vault.job_from_note`` for matchers.
        Inputs: ``JobNote`` from ``iter_job_notes``.
        Returns: ``Job`` dataclass.
        Does not: Fetch listing URLs.
        """

        meta = post.metadata
        company = _unwrap_wikilink(str(meta.get("company") or "Unknown"))
        crawl = meta.get("crawl", meta.get("crawl_allowed", True))
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
            crawl_allowed=bool(crawl),
        )

    def update_job_meta(self, source_id: str, **updates: object) -> Path | None:
        """Patch job columns and extra_json fields.

        Purpose: Matcher and API status/score updates.
        Inputs: ``source_id`` and keyword fields.
        Returns: Logical job path when the row exists, else ``None``.
        Does not: Delete the job row.
        """

        row = self._conn.execute(
            "SELECT * FROM jobs WHERE source_id = ?",
            (source_id,),
        ).fetchone()
        if row is None:
            return None

        sets: list[str] = []
        params: list[Any] = []
        extra = json.loads(row["extra_json"] or "{}")

        for key, value in updates.items():
            if key in _JOB_COLUMNS:
                if key == "crawl_allowed":
                    sets.append("crawl_allowed = ?")
                    params.append(1 if value else 0)
                elif key == "gemini":
                    sets.append("gemini = ?")
                    params.append(None if value is None else (1 if value else 0))
                else:
                    sets.append(f"{key} = ?")
                    params.append(value)
            else:
                extra[key] = value

        sets.append("extra_json = ?")
        params.append(json.dumps(extra))
        sets.append("updated_at = ?")
        params.append(utc_now())
        params.append(source_id)

        self._conn.execute(
            f"UPDATE jobs SET {', '.join(sets)} WHERE source_id = ?",
            params,
        )
        self._conn.commit()
        return self._job_path(source_id, str(row["source"] or "unknown"))

    def find_job_path(self, source_id: str) -> Path | None:
        """Resolve the logical path for a job note.

        Purpose: Letter save/load compatibility with markdown vault.
        Inputs: ``source_id``.
        Returns: Path under ``files/jobs/`` or ``None``.
        Does not: Require a file on disk.
        """

        row = self._conn.execute(
            "SELECT source FROM jobs WHERE source_id = ?",
            (source_id,),
        ).fetchone()
        if row is None:
            return None
        return self._job_path(source_id, str(row["source"] or "unknown"))

    def load_requirements(self) -> Requirements:
        """Read search filters from the requirements table.

        Purpose: Scout/match/write configuration.
        Inputs: None.
        Returns: ``Requirements`` (defaults when row missing).
        Does not: Write disk markdown.
        """

        row = self._conn.execute(
            "SELECT payload_json FROM requirements WHERE id = 1"
        ).fetchone()
        if not row:
            return Requirements()
        try:
            data = json.loads(row["payload_json"] or "{}")
        except json.JSONDecodeError:
            data = {}
        return Requirements.from_mapping(data)

    def save_requirements(self, requirements: Requirements) -> None:
        """Persist requirements as JSON (single row id=1).

        Purpose: Settings API and Obsidian import.
        Inputs: ``Requirements`` dataclass.
        Returns: None.
        Does not: Emit Requirements.md.
        """

        payload = json.dumps(
            {
                "locations": list(requirements.locations),
                "salary_floor": requirements.salary_floor,
                "languages": list(requirements.languages),
                "banned_terms": list(requirements.banned_terms),
                "skip_companies": list(requirements.skip_companies),
                "must_have": list(requirements.must_have),
                "nice_to_have": list(requirements.nice_to_have),
                "tone": requirements.tone,
            }
        )
        self._conn.execute(
            """
            INSERT INTO requirements(id, payload_json) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json
            """,
            (payload,),
        )
        self._conn.commit()

    def read_cv(self) -> str:
        """Return text for the active CV document.

        Purpose: Matcher and writer CV slice.
        Inputs: None.
        Returns: Extracted CV text or empty string.
        Does not: Return original binary bytes.
        """

        active = next((d for d in self.list_documents("cv") if d.active_cv), None)
        if not active:
            return ""
        return self.document_text(active.id) or ""

    def read_voice_samples(self) -> str:
        """Return text for the active voice document.

        Purpose: Writer tone samples.
        Inputs: None.
        Returns: Extracted voice text or empty string.
        Does not: Return original binary bytes.
        """

        active = next((d for d in self.list_documents("voice") if d.active_voice), None)
        if not active:
            return ""
        return self.document_text(active.id) or ""

    def read_company_body(self, company: str) -> str:
        """Load company research markdown from SQLite.

        Purpose: Writer context for one employer.
        Inputs: Company display name (primary key).
        Returns: Body text or empty string.
        Does not: Crawl company websites.
        """

        row = self._conn.execute(
            "SELECT body FROM companies WHERE name = ?",
            (company,),
        ).fetchone()
        return str(row["body"] or "") if row else ""

    def write_letter(
        self,
        job: Job,
        body: str,
        *,
        model: str,
        tokens_in: int,
        tokens_out: int,
    ) -> Path:
        """Write letter file, letters row, and link job to draft.

        Purpose: Pipeline letter generation.
        Inputs: ``Job``, markdown body, model token counts.
        Returns: Path to ``files/letters/{name}.md``.
        Does not: Submit applications.
        """

        self.ensure_dirs()
        today = date.today().isoformat()
        filename = f"{today}-{safe_filename(job.company)}-{safe_filename(job.title, 40)}.md"
        letter_path = self._root / "files" / "letters" / filename
        rel_letter = f"files/letters/{filename}"
        letter_path.write_text(body.strip() + "\n", encoding="utf-8")
        now = utc_now()

        self._conn.execute(
            """
            INSERT INTO letters(source_id, body, model, tokens_in, tokens_out, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                body = excluded.body,
                model = excluded.model,
                tokens_in = excluded.tokens_in,
                tokens_out = excluded.tokens_out,
                updated_at = excluded.updated_at
            """,
            (job.source_id, body.strip(), model, tokens_in, tokens_out, now),
        )
        self._conn.execute(
            """
            UPDATE jobs SET
                status = 'draft',
                letter_path = ?,
                gemini = 1,
                updated_at = ?
            WHERE source_id = ?
            """,
            (rel_letter, now, job.source_id),
        )
        extra_row = self._conn.execute(
            "SELECT extra_json FROM jobs WHERE source_id = ?",
            (job.source_id,),
        ).fetchone()
        if extra_row is not None:
            extra = json.loads(extra_row["extra_json"] or "{}")
            extra["gemini_model"] = model
            extra["tokens_in"] = tokens_in
            extra["tokens_out"] = tokens_out
            self._conn.execute(
                "UPDATE jobs SET extra_json = ? WHERE source_id = ?",
                (json.dumps(extra), job.source_id),
            )
        self._conn.commit()
        return letter_path

    def get_letter(self, source_id: str) -> LetterRecord | None:
        """Load cover letter body and metadata for one job.

        Purpose: Packet editor read path.
        Inputs: Job ``source_id``.
        Returns: ``LetterRecord`` or ``None``.
        Does not: Include CV text.
        """

        row = self._conn.execute(
            "SELECT * FROM letters WHERE source_id = ?",
            (source_id,),
        ).fetchone()
        if row is None:
            return None
        return LetterRecord(
            source_id=source_id,
            body=str(row["body"] or ""),
            model=str(row["model"] or ""),
            tokens_in=int(row["tokens_in"] or 0),
            tokens_out=int(row["tokens_out"] or 0),
            updated_at=str(row["updated_at"] or ""),
        )

    def save_letter_body(self, source_id: str, body: str) -> LetterRecord:
        """Update letter text in SQLite and on disk.

        Purpose: User edits from the Packet UI.
        Inputs: ``source_id`` and new markdown body.
        Returns: Updated ``LetterRecord``.
        Does not: Change job status.
        """

        existing = self.get_letter(source_id)
        job_row = self._conn.execute(
            "SELECT letter_path FROM jobs WHERE source_id = ?",
            (source_id,),
        ).fetchone()
        if job_row is None:
            raise FileNotFoundError(f"Job {source_id} not found")

        now = utc_now()
        letter_path = self._resolve_letter_path(
            str(job_row["letter_path"] or ""),
            source_id,
        )
        letter_path.parent.mkdir(parents=True, exist_ok=True)
        letter_path.write_text(body.strip() + "\n", encoding="utf-8")
        rel = letter_path.relative_to(self._root).as_posix()

        model = existing.model if existing else ""
        tokens_in = existing.tokens_in if existing else 0
        tokens_out = existing.tokens_out if existing else 0

        self._conn.execute(
            """
            INSERT INTO letters(source_id, body, model, tokens_in, tokens_out, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                body = excluded.body,
                updated_at = excluded.updated_at
            """,
            (source_id, body.strip(), model, tokens_in, tokens_out, now),
        )
        self._conn.execute(
            "UPDATE jobs SET letter_path = ?, updated_at = ? WHERE source_id = ?",
            (rel, now, source_id),
        )
        self._conn.commit()
        return LetterRecord(
            source_id=source_id,
            body=body.strip(),
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            updated_at=now,
        )

    def list_documents(self, kind: DocumentKind | None = None) -> list[DocumentMeta]:
        """List document metadata without bodies or file bytes.

        Purpose: Vault UI library grid.
        Inputs: Optional kind filter.
        Returns: ``DocumentMeta`` rows.
        Does not: Return extracted text or secrets.
        """

        if kind:
            rows = self._conn.execute(
                "SELECT * FROM documents WHERE kind = ? ORDER BY created_at",
                (kind,),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM documents ORDER BY created_at"
            ).fetchall()
        return [_document_row_to_meta(row) for row in rows]

    def get_document(self, doc_id: str) -> DocumentMeta | None:
        """Fetch one document row by id.

        Purpose: Document detail API.
        Inputs: Document id.
        Returns: ``DocumentMeta`` or ``None``.
        Does not: Read file bytes.
        """

        row = self._conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return None
        return _document_row_to_meta(row)

    def add_document(
        self,
        *,
        kind: DocumentKind,
        label: str,
        original_name: str,
        mime: str,
        raw: bytes,
        extracted_text: str = "",
        extract_status: str = "empty",
        active_cv: bool = False,
        active_voice: bool = False,
    ) -> DocumentMeta:
        """Store uploaded bytes and index metadata in SQLite.

        Purpose: POST /documents multipart upload.
        Inputs: Kind, label, mime, raw bytes, optional extracted text and status.
        Returns: New ``DocumentMeta``.
        Does not: Crawl URLs embedded in uploads.
        """

        self.ensure_dirs()
        doc_id = uuid.uuid4().hex[:12]
        rel_dir = f"documents/{doc_id}"
        folder = self._root / "files" / rel_dir
        folder.mkdir(parents=True, exist_ok=True)
        suffix = Path(original_name).suffix or ".bin"
        (folder / f"original{suffix}").write_bytes(raw)

        text = extracted_text
        status = extract_status if extract_status in {"ok", "empty", "unsupported", "error"} else "empty"
        if not text and (mime.startswith("text/") or suffix.lower() in {".md", ".txt"}):
            try:
                text = raw.decode("utf-8")
                status = "ok" if text.strip() else "empty"
            except UnicodeDecodeError:
                text = ""
                status = "error"
        if text:
            (folder / "extracted.txt").write_text(text, encoding="utf-8")
        elif status in {"ok", "empty", "error"} and (
            mime.startswith("text/")
            or suffix.lower() in {".md", ".txt", ".pdf", ".docx"}
            or "pdf" in mime
            or "wordprocessingml" in mime
        ):
            # Record an empty extract file so callers know extract was attempted.
            (folder / "extracted.txt").write_text("", encoding="utf-8")

        words = len(text.split()) if text else 0
        now = utc_now()

        if active_cv:
            self._conn.execute("UPDATE documents SET active_cv = 0")
        if active_voice:
            self._conn.execute("UPDATE documents SET active_voice = 0")

        self._conn.execute(
            """
            INSERT INTO documents (
                id, kind, label, mime, word_count, active_cv, active_voice,
                original_name, rel_dir, created_at, updated_at, extract_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc_id,
                kind,
                label,
                mime,
                words,
                1 if active_cv else 0,
                1 if active_voice else 0,
                original_name,
                rel_dir,
                now,
                now,
                status,
            ),
        )
        self._conn.commit()
        return DocumentMeta(
            id=doc_id,
            kind=kind,
            label=label,
            mime=mime,
            word_count=words,
            active_cv=active_cv,
            active_voice=active_voice,
            created_at=now,
            updated_at=now,
            original_name=original_name,
            extract_status=status,  # type: ignore[arg-type]
        )

    def patch_document(self, doc_id: str, **updates: object) -> DocumentMeta | None:
        """Update document metadata fields.

        Purpose: Set active CV/voice or relabel uploads.
        Inputs: Document id and allowed keyword updates.
        Returns: Updated meta or ``None``.
        Does not: Replace original file bytes.
        """

        row = self._conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return None

        if updates.get("active_cv") is True:
            self._conn.execute("UPDATE documents SET active_cv = 0")
        if updates.get("active_voice") is True:
            self._conn.execute("UPDATE documents SET active_voice = 0")

        sets: list[str] = []
        params: list[Any] = []
        for key in ("label", "kind", "active_cv", "active_voice"):
            if key in updates and updates[key] is not None:
                val = updates[key]
                if key in {"active_cv", "active_voice"}:
                    val = 1 if val else 0
                sets.append(f"{key} = ?")
                params.append(val)

        if not sets:
            return _document_row_to_meta(row)

        sets.append("updated_at = ?")
        params.append(utc_now())
        params.append(doc_id)
        self._conn.execute(
            f"UPDATE documents SET {', '.join(sets)} WHERE id = ?",
            params,
        )
        self._conn.commit()
        updated = self._conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        return _document_row_to_meta(updated) if updated else None

    def delete_document(self, doc_id: str) -> bool:
        """Remove document row and files on disk.

        Purpose: Vault UI delete action.
        Inputs: Document id.
        Returns: ``True`` when a row was deleted.
        Does not: Touch unrelated jobs.
        """

        row = self._conn.execute(
            "SELECT rel_dir FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return False
        self._conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        self._conn.commit()
        folder = self._root / "files" / str(row["rel_dir"] or f"documents/{doc_id}")
        if folder.exists():
            shutil.rmtree(folder)
        return True

    def document_text(self, doc_id: str) -> str | None:
        """Read extracted plain text for a document.

        Purpose: Active CV/voice slices for match and write.
        Inputs: Document id.
        Returns: UTF-8 text or ``None``.
        Does not: Parse PDF/DOCX on read (extraction happens at upload).
        """

        row = self._conn.execute(
            "SELECT rel_dir FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return None
        path = self._root / "files" / str(row["rel_dir"]) / "extracted.txt"
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

    def document_file_path(self, doc_id: str) -> Path | None:
        """Resolve the original upload file path.

        Purpose: Download original bytes from API.
        Inputs: Document id.
        Returns: Path matching ``original*`` or ``None``.
        Does not: Read file contents.
        """

        row = self._conn.execute(
            "SELECT rel_dir FROM documents WHERE id = ?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return None
        folder = self._root / "files" / str(row["rel_dir"])
        if not folder.is_dir():
            return None
        for path in folder.iterdir():
            if path.name.startswith("original"):
                return path
        return None

    def regenerate_home(self, *, last_run: str = "") -> Path:
        """Rebuild ``Home.md`` from actionable jobs in SQLite.

        Purpose: Dashboard table after pipeline or import.
        Inputs: Optional last-run timestamp label.
        Returns: Path to ``Home.md`` under the data root.
        Does not: Change job statuses.
        """

        rows: list[dict[str, Any]] = []
        for note in self.iter_job_notes():
            status = str(note.metadata.get("status") or "inbox")
            if status not in ACTIONABLE:
                continue
            path = note.metadata.get("_path") or ""
            stem = Path(str(path)).stem if path else safe_filename(
                str(note.metadata.get("source_id") or "job")
            )
            rows.append(
                {
                    "status": status,
                    "score": note.metadata.get("score") or "",
                    "title": note.metadata.get("title") or "Untitled",
                    "company": note.metadata.get("company") or "",
                    "letter": note.metadata.get("letter") or "",
                    "path": stem,
                }
            )
        order = {"draft": 0, "approved": 1, "shortlist": 2}
        rows.sort(key=lambda row: (order.get(str(row["status"]), 9), _score_sort(row["score"])))
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
        lines.extend(
            [
                "",
                "## How to use",
                "",
                "- `inbox` = fetched, not scored in",
                "- `shortlist` = matcher kept it, letter not written yet",
                "- `draft` = letter ready for you",
                "- `approved` / `applied` / `skipped` = your call",
                "",
            ]
        )
        path = self._root / "Home.md"
        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    def append_run_note(self, day: str, body: str) -> Path:
        """Append markdown to a daily run log file.

        Purpose: Pipeline run history (mirrors vault ``Runs/{day}.md``).
        Inputs: ISO day string and markdown body.
        Returns: Path to the run note file.
        Does not: Start the pipeline.
        """

        self.ensure_dirs()
        path = self._root / "files" / "runs" / f"{day}.md"
        if path.exists():
            existing = path.read_text(encoding="utf-8")
            path.write_text(existing.rstrip() + "\n\n" + body.strip() + "\n", encoding="utf-8")
        else:
            header = f"---\ntype: run\ndate: {day}\n---\n\n# Run {day}\n\n"
            path.write_text(header + body.strip() + "\n", encoding="utf-8")
        return path

    def list_run_notes(self) -> list[RunRecord]:
        """List async run rows and file-based run notes.

        Purpose: Activity feed and GET /runs (native backend).
        Inputs: None.
        Returns: ``RunRecord`` list, newest first.
        Does not: Return API keys or CV text.
        """

        by_id: dict[str, RunRecord] = {}
        for row in self._conn.execute(
            "SELECT * FROM runs ORDER BY COALESCE(started, id) DESC"
        ).fetchall():
            by_id[str(row["id"])] = _run_row_to_record(row)

        runs_dir = self._root / "files" / "runs"
        if runs_dir.is_dir():
            for path in sorted(runs_dir.glob("*.md"), reverse=True):
                day = path.stem
                if day in by_id:
                    continue
                text = path.read_text(encoding="utf-8")
                preview = text.strip()[:500]
                errors: list[str] = []
                if "### Errors" in text:
                    errors = ["see run note"]
                by_id[day] = RunRecord(
                    id=day,
                    status="completed",
                    started=day,
                    preview=preview,
                    errors=errors,
                )

        return sorted(by_id.values(), key=lambda r: r.started or r.id, reverse=True)

    def upsert_run_status(self, record: RunRecord) -> None:
        """Insert or replace one pipeline run status row.

        Purpose: Async POST /runs progress tracking in SQLite.
        Inputs: ``RunRecord`` with id and status fields.
        Returns: None.
        Does not: Append markdown run notes (use ``append_run_note``).
        """

        errors_json = json.dumps(list(record.errors))
        self._conn.execute(
            """
            INSERT INTO runs (
                id, status, started, finished, scouted, shortlisted, skipped,
                written, write_skipped, errors_json, model, preview, trigger, owner, heartbeat, cancel_requested
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                started = excluded.started,
                finished = excluded.finished,
                scouted = excluded.scouted,
                shortlisted = excluded.shortlisted,
                skipped = excluded.skipped,
                written = excluded.written,
                write_skipped = excluded.write_skipped,
                errors_json = excluded.errors_json,
                model = excluded.model,
                preview = excluded.preview,
                trigger = excluded.trigger,
                owner = excluded.owner,
                heartbeat = excluded.heartbeat,
                cancel_requested = excluded.cancel_requested
            """,
            (
                record.id,
                record.status,
                record.started,
                record.finished,
                record.scouted,
                record.shortlisted,
                record.skipped,
                record.written,
                record.write_skipped,
                errors_json,
                record.model,
                record.preview,
                record.trigger,
                record.owner,
                record.heartbeat,
                int(record.cancel_requested),
            ),
        )
        self._conn.commit()

    def journal_mode(self) -> str:
        """Return the SQLite journal mode (``wal`` when WAL is active).

        Purpose: Diagnostics and tests.
        Inputs: None.
        Returns: Lower-case journal mode string.
        Does not: Change the mode.
        """

        row = self._conn.execute("PRAGMA journal_mode").fetchone()
        return str(row[0]).lower() if row else ""

    def close(self) -> None:
        """Close the SQLite connection.

        Purpose: Clean shutdown for tests and long-lived workers.
        Inputs: None.
        Returns: None.
        Does not: Delete data files.
        """

        self._conn.close()

    def _job_path(self, source_id: str, source: str) -> Path:
        stem = f"{source}-{safe_filename(source_id, 80)}"
        return self._root / "files" / "jobs" / f"{stem}.md"

    def _job_row_to_metadata(self, row: sqlite3.Row) -> dict[str, Any]:
        meta: dict[str, Any] = {
            "type": "job",
            "status": row["status"],
            "company": row["company"],
            "title": row["title"],
            "score": row["score"],
            "source": row["source"],
            "source_id": row["source_id"],
            "url": row["url"],
            "location": row["location"],
            "lang": row["lang"],
            "salary": row["salary"],
            "crawl": bool(row["crawl_allowed"]),
            "letter": None,
            "gemini": bool(row["gemini"]) if row["gemini"] is not None else None,
        }
        letter_path = str(row["letter_path"] or "").strip()
        if letter_path:
            stem = Path(letter_path).stem
            meta["letter"] = f"[[Letters/{stem}]]"
        if row["skip_reason"]:
            meta["skip_reason"] = row["skip_reason"]
        if row["why_match"]:
            meta["why_match"] = row["why_match"]
        extra = json.loads(row["extra_json"] or "{}")
        meta.update(extra)
        meta["_path"] = str(
            self._job_path(str(row["source_id"]), str(row["source"] or "unknown"))
        )
        return meta

    def _upsert_company(self, job: Job) -> None:
        row = self._conn.execute(
            "SELECT body FROM companies WHERE name = ?",
            (job.company,),
        ).fetchone()
        if row is not None:
            body = str(row["body"] or "")
            if job.address and job.address.lower() not in body.lower():
                body = body.rstrip() + f"\n\n## Address\n\n{job.address}\n"
                self._conn.execute(
                    "UPDATE companies SET body = ? WHERE name = ?",
                    (body, job.company),
                )
            return

        lines = [f"# {job.company}", ""]
        if job.address:
            lines.extend(["## Address", "", job.address, ""])
        else:
            lines.extend(["Address / Impressum not yet filled.", ""])
        self._conn.execute(
            "INSERT INTO companies(name, body) VALUES (?, ?)",
            (job.company, "\n".join(lines)),
        )

    def _resolve_letter_path(self, letter_path: str, source_id: str) -> Path:
        if letter_path:
            path = self._root / letter_path
            if not path.is_absolute():
                path = self._root / letter_path.lstrip("/")
            return path
        filename = f"edit-{safe_filename(source_id, 80)}.md"
        return self._root / "files" / "letters" / filename

    def find_active_run(self) -> RunRecord | None:
        """Find the currently active run (queued or running) with fresh heartbeat.

        Purpose: Check if a run is currently active and not stale.
        Inputs: None.
        Returns: RunRecord or None if no active run exists or it's stale.
        Does not: Modify any data.
        """
        rows = self._conn.execute(
            "SELECT * FROM runs WHERE status IN ('queued', 'running')"
        ).fetchall()

        for row in rows:
            heartbeat = str(row["heartbeat"] or "")
            age = _heartbeat_age_seconds(heartbeat)
            if age is not None and age <= HEARTBEAT_STALE_SECONDS:
                return _run_row_to_record(row)
        return None

    def settle_stale_active_runs(self) -> list[str]:
        """Set stale active runs to failed status.

        Purpose: Mark runs as interrupted if their heartbeat is too old.
        Inputs: None.
        Returns: List of run IDs that were settled.
        Does not: Modify any data except the runs table.
        """
        ids_settled = []

        rows = self._conn.execute(
            "SELECT * FROM runs WHERE status IN ('queued', 'running')"
        ).fetchall()

        for row in rows:
            heartbeat = str(row["heartbeat"] or "")
            age = _heartbeat_age_seconds(heartbeat)

            # If heartbeat is stale (older than 60 seconds) or invalid
            if age is None or age > HEARTBEAT_STALE_SECONDS:
                run_id = str(row["id"])

                # Set status to failed and add error message
                errors_json = row["errors_json"] or "[]"
                try:
                    errors = json.loads(errors_json)
                except json.JSONDecodeError:
                    errors = []

                # Add the interruption error if not already present
                interrupt_msg = "interrupted: the server stopped before this run finished"
                if interrupt_msg not in errors:
                    errors.append(interrupt_msg)

                errors_json = json.dumps(errors)

                # Clear cancel_requested flag and update
                self._conn.execute(
                    """
                    UPDATE runs SET
                        status = 'failed',
                        errors_json = ?,
                        cancel_requested = 0
                    WHERE id = ?
                    """,
                    (errors_json, run_id)
                )
                ids_settled.append(run_id)

        if ids_settled:
            self._conn.commit()

        return ids_settled

    def request_run_cancel(self, run_id: str) -> bool:
        """Request cancellation of an active run.

        Purpose: Mark a queued/running run for cooperative cancel (cross-process).
        Inputs: Run ID.
        Returns: True if an active row was found and updated; False if missing or not active.
        Does not: Stop an in-flight Gemini call.
        """
        row = self._conn.execute(
            "SELECT id, status FROM runs WHERE id = ?",
            (run_id,),
        ).fetchone()
        if row is None:
            return False
        if str(row["status"] or "") not in ("queued", "running"):
            return False
        self._conn.execute(
            "UPDATE runs SET cancel_requested = 1 WHERE id = ?",
            (run_id,),
        )
        self._conn.commit()
        return True

    def is_run_cancel_requested(self, run_id: str) -> bool:
        """Check if cancellation was requested for a run.

        Purpose: Check if a run should be cancelled.
        Inputs: Run ID.
        Returns: True if cancellation was requested, False otherwise.
        Does not: Modify any data.
        """
        row = self._conn.execute(
            "SELECT cancel_requested FROM runs WHERE id = ?",
            (run_id,)
        ).fetchone()

        if row is None:
            return False

        return bool(int(row["cancel_requested"] or 0))

    def touch_run_heartbeat(self, run_id: str, when: str | None = None) -> None:
        """Update heartbeat timestamp for a run.

        Purpose: Mark that a run is still active.
        Inputs: Run ID and optional timestamp (defaults to current time).
        Returns: None.
        Does not: Modify any data except the runs table.
        """
        if when is None:
            when = utc_now()

        self._conn.execute(
            "UPDATE runs SET heartbeat = ? WHERE id = ?",
            (when, run_id)
        )
        self._conn.commit()


def _document_row_to_meta(row: sqlite3.Row) -> DocumentMeta:
    keys = set(row.keys())
    status = str(row["extract_status"] or "empty") if "extract_status" in keys else "empty"
    if status not in {"ok", "empty", "unsupported", "error"}:
        status = "empty"
    return DocumentMeta(
        id=str(row["id"]),
        kind=row["kind"],  # type: ignore[arg-type]
        label=str(row["label"] or ""),
        mime=str(row["mime"] or "application/octet-stream"),
        word_count=int(row["word_count"] or 0),
        active_cv=bool(row["active_cv"]),
        active_voice=bool(row["active_voice"]),
        created_at=str(row["created_at"] or ""),
        updated_at=str(row["updated_at"] or ""),
        original_name=str(row["original_name"] or ""),
        extract_status=status,  # type: ignore[arg-type]
    )


def _run_row_to_record(row: sqlite3.Row) -> RunRecord:
    try:
        errors = json.loads(row["errors_json"] or "[]")
    except json.JSONDecodeError:
        errors = []
    if not isinstance(errors, list):
        errors = []
    return RunRecord(
        id=str(row["id"]),
        status=str(row["status"] or "completed"),
        started=str(row["started"] or ""),
        finished=str(row["finished"] or ""),
        scouted=int(row["scouted"] or 0),
        shortlisted=int(row["shortlisted"] or 0),
        skipped=int(row["skipped"] or 0),
        written=int(row["written"] or 0),
        write_skipped=int(row["write_skipped"] or 0),
        errors=[str(e) for e in errors],
        model=str(row["model"] or ""),
        preview=str(row["preview"] or ""),
        trigger=str(row["trigger"] or "api"),
        owner=str(row["owner"] or ""),
        heartbeat=str(row["heartbeat"] or ""),
        cancel_requested=bool(int(row["cancel_requested"] or 0)),
    )


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


def _heartbeat_age_seconds(heartbeat: str) -> float | None:
    """Calculate age of heartbeat in seconds.

    Purpose: Determine if a run is stale.
    Inputs: ISO timestamp string.
    Returns: Age in seconds or None if unparseable/empty.
    Does not: Modify any data.
    """
    if not heartbeat:
        return None
    try:
        from datetime import datetime

        heartbeat_dt = datetime.fromisoformat(heartbeat)
        if heartbeat_dt.tzinfo is None:
            heartbeat_dt = heartbeat_dt.astimezone()
        now = datetime.now().astimezone()
        return (now - heartbeat_dt).total_seconds()
    except (TypeError, ValueError):
        return None

