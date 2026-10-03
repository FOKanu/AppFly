"""Markdown / Obsidian vault adapter implementing AppStore.

Purpose: Preserve existing vault.py behavior behind the store protocol.
Inputs: A ``Vault`` root path from AppConfig.
Returns: ``MarkdownVaultStore`` methods.
Does not: Use SQLite or change on-disk note shapes.
"""

from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Any

import frontmatter

from jobhunt.models import Job, Requirements
from jobhunt.store.types import DocumentKind, DocumentMeta, JobNote, LetterRecord, RunRecord, utc_now
from jobhunt.vault import Vault


class MarkdownVaultStore:
    """AppStore backed by ``Vault`` markdown notes.

    Purpose: Zero-behavior-change adapter for ``storage_backend: markdown``.
    Inputs: Vault root path.
    Returns: Store methods delegating to ``Vault``.
    Does not: Create a SQLite database.
    """

    backend_name = "markdown"

    def __init__(self, root: Path) -> None:
        self._vault = Vault(root)
        self._doc_index = root / ".appfly" / "documents.json"

    @property
    def vault(self) -> Vault:
        return self._vault

    def ensure_dirs(self) -> None:
        self._vault.ensure_dirs()
        (self._vault.root / ".appfly" / "documents").mkdir(parents=True, exist_ok=True)

    def data_path(self) -> Path:
        return self._vault.root

    def existing_source_ids(self) -> set[str]:
        return self._vault.existing_source_ids()

    def upsert_job(self, job: Job, *, status: str = "inbox") -> Path:
        return self._vault.upsert_job(job, status=status)

    def iter_job_notes(self) -> list[JobNote]:
        notes: list[JobNote] = []
        for post in self._vault.iter_job_notes():
            meta = {k: v for k, v in post.metadata.items()}
            notes.append(JobNote(metadata=meta, content=post.content or ""))
        return notes

    def job_from_note(self, post: JobNote) -> Job:
        fake = frontmatter.Post(post.content, **post.metadata)
        return self._vault.job_from_note(fake)

    def update_job_meta(self, source_id: str, **updates: object) -> Path | None:
        return self._vault.update_job_meta(source_id, **updates)

    def find_job_path(self, source_id: str) -> Path | None:
        return self._vault.find_job_path(source_id)

    @property
    def inbox_dir(self) -> Path:
        return self._vault.inbox_dir

    def load_requirements(self) -> Requirements:
        return self._vault.load_requirements()

    def save_requirements(self, requirements: Requirements) -> None:
        path = self._vault.root / "Requirements.md"
        meta = {
            "locations": list(requirements.locations),
            "salary_floor": requirements.salary_floor,
            "languages": list(requirements.languages),
            "banned_terms": list(requirements.banned_terms),
            "skip_companies": list(requirements.skip_companies),
            "must_have": list(requirements.must_have),
            "nice_to_have": list(requirements.nice_to_have),
            "tone": requirements.tone,
        }
        # Keep body; replace frontmatter via frontmatter dump of empty content + meta if needed
        if path.exists():
            post = frontmatter.loads(path.read_text(encoding="utf-8"))
            post.metadata.update(meta)
            clean = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
            path.write_text(frontmatter.dumps(frontmatter.Post(post.content, **clean)), encoding="utf-8")
        else:
            path.write_text(frontmatter.dumps(frontmatter.Post("# Requirements\n", **meta)), encoding="utf-8")

    def read_cv(self) -> str:
        active = next((d for d in self.list_documents("cv") if d.active_cv), None)
        if active:
            text = self.document_text(active.id)
            if text:
                return text
        return self._vault.read_cv()

    def read_voice_samples(self) -> str:
        active = next((d for d in self.list_documents("voice") if d.active_voice), None)
        if active:
            text = self.document_text(active.id)
            if text:
                return text
        return self._vault.read_voice_samples()

    def read_company_body(self, company: str) -> str:
        return self._vault.read_company_body(company)

    def write_letter(
        self,
        job: Job,
        body: str,
        *,
        model: str,
        tokens_in: int,
        tokens_out: int,
    ) -> Path:
        return self._vault.write_letter(
            job, body, model=model, tokens_in=tokens_in, tokens_out=tokens_out
        )

    def get_letter(self, source_id: str) -> LetterRecord | None:
        path = self.find_job_path(source_id)
        if not path:
            return None
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        letter_ref = str(post.metadata.get("letter") or "").strip()
        if not letter_ref or letter_ref in {"None", "null"}:
            return None
        match = re.match(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", letter_ref)
        target = match.group(1).strip() if match else letter_ref
        stem = target.split("/")[-1]
        letter_path = self._vault.letters_dir / f"{stem}.md"
        if not letter_path.exists():
            return None
        letter = frontmatter.loads(letter_path.read_text(encoding="utf-8"))
        return LetterRecord(
            source_id=source_id,
            body=(letter.content or "").strip(),
            model=str(letter.metadata.get("model") or ""),
            tokens_in=int(letter.metadata.get("tokens_in") or 0),
            tokens_out=int(letter.metadata.get("tokens_out") or 0),
            updated_at=str(letter.metadata.get("date") or ""),
        )

    def save_letter_body(self, source_id: str, body: str) -> LetterRecord:
        existing = self.get_letter(source_id)
        path = self.find_job_path(source_id)
        if path is None:
            raise FileNotFoundError(f"Job {source_id} not found")
        post = frontmatter.loads(path.read_text(encoding="utf-8"))
        letter_ref = str(post.metadata.get("letter") or "").strip()
        if letter_ref and letter_ref not in {"None", "null"}:
            match = re.match(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", letter_ref)
            target = match.group(1).strip() if match else letter_ref
            stem = target.split("/")[-1]
            letter_path = self._vault.letters_dir / f"{stem}.md"
        else:
            self._vault.letters_dir.mkdir(parents=True, exist_ok=True)
            stem = f"edit-{source_id}"
            letter_path = self._vault.letters_dir / f"{stem}.md"
            post.metadata["letter"] = f"[[Letters/{stem}]]"
            post.metadata["status"] = post.metadata.get("status") or "draft"
            clean = {k: v for k, v in post.metadata.items() if not str(k).startswith("_")}
            path.write_text(frontmatter.dumps(frontmatter.Post(post.content, **clean)), encoding="utf-8")

        meta: dict[str, Any] = {"type": "letter", "source_id": source_id}
        if letter_path.exists():
            old = frontmatter.loads(letter_path.read_text(encoding="utf-8"))
            meta.update({k: v for k, v in old.metadata.items() if not str(k).startswith("_")})
        meta["source_id"] = source_id
        letter_path.write_text(
            frontmatter.dumps(frontmatter.Post(body.strip() + "\n", **meta)),
            encoding="utf-8",
        )
        return LetterRecord(
            source_id=source_id,
            body=body.strip(),
            model=str(meta.get("model") or (existing.model if existing else "")),
            tokens_in=int(meta.get("tokens_in") or (existing.tokens_in if existing else 0)),
            tokens_out=int(meta.get("tokens_out") or (existing.tokens_out if existing else 0)),
            updated_at=utc_now(),
        )

    def list_documents(self, kind: DocumentKind | None = None) -> list[DocumentMeta]:
        rows = self._load_doc_index()
        out = [DocumentMeta(**row) for row in rows]
        if kind:
            out = [d for d in out if d.kind == kind]
        return out

    def get_document(self, doc_id: str) -> DocumentMeta | None:
        return next((d for d in self.list_documents() if d.id == doc_id), None)

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
        self.ensure_dirs()
        doc_id = uuid.uuid4().hex[:12]
        folder = self._vault.root / ".appfly" / "documents" / doc_id
        folder.mkdir(parents=True, exist_ok=True)
        suffix = Path(original_name).suffix or ".bin"
        original_path = folder / f"original{suffix}"
        original_path.write_bytes(raw)
        status = extract_status if extract_status in {"ok", "empty", "unsupported", "error"} else "empty"
        if extracted_text:
            (folder / "extracted.txt").write_text(extracted_text, encoding="utf-8")
            status = status if status != "empty" else "ok"
        elif mime.startswith("text/") or suffix.lower() in {".md", ".txt"}:
            try:
                text = raw.decode("utf-8")
                (folder / "extracted.txt").write_text(text, encoding="utf-8")
                extracted_text = text
                status = "ok" if text.strip() else "empty"
            except UnicodeDecodeError:
                extracted_text = ""
                status = "error"
        words = len(extracted_text.split()) if extracted_text else 0
        now = utc_now()
        meta = DocumentMeta(
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
        rows = self._load_doc_index()
        if active_cv:
            for row in rows:
                row["active_cv"] = False
        if active_voice:
            for row in rows:
                row["active_voice"] = False
        rows.append(_meta_to_dict(meta))
        self._save_doc_index(rows)
        return meta

    def patch_document(self, doc_id: str, **updates: object) -> DocumentMeta | None:
        rows = self._load_doc_index()
        found = None
        for row in rows:
            if row.get("id") == doc_id:
                found = row
                break
        if found is None:
            return None
        if updates.get("active_cv") is True:
            for row in rows:
                row["active_cv"] = False
        if updates.get("active_voice") is True:
            for row in rows:
                row["active_voice"] = False
        for key in ("label", "kind", "active_cv", "active_voice"):
            if key in updates and updates[key] is not None:
                found[key] = updates[key]
        found["updated_at"] = utc_now()
        self._save_doc_index(rows)
        return DocumentMeta(**found)

    def delete_document(self, doc_id: str) -> bool:
        import shutil

        rows = self._load_doc_index()
        new_rows = [r for r in rows if r.get("id") != doc_id]
        if len(new_rows) == len(rows):
            return False
        folder = self._vault.root / ".appfly" / "documents" / doc_id
        if folder.exists():
            shutil.rmtree(folder)
        self._save_doc_index(new_rows)
        return True

    def document_text(self, doc_id: str) -> str | None:
        path = self._vault.root / ".appfly" / "documents" / doc_id / "extracted.txt"
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

    def document_file_path(self, doc_id: str) -> Path | None:
        folder = self._vault.root / ".appfly" / "documents" / doc_id
        if not folder.exists():
            return None
        for path in folder.iterdir():
            if path.name.startswith("original"):
                return path
        return None

    def regenerate_home(self, *, last_run: str = "") -> Path:
        return self._vault.regenerate_home(last_run=last_run)

    def append_run_note(self, day: str, body: str) -> Path:
        return self._vault.append_run_note(day, body)

    def list_run_notes(self) -> list[RunRecord]:
        runs: list[RunRecord] = []
        if not self._vault.runs_dir.exists():
            return runs
        for path in sorted(self._vault.runs_dir.glob("*.md"), reverse=True):
            if path.name.startswith("."):
                continue
            text = path.read_text(encoding="utf-8")
            runs.append(
                RunRecord(
                    id=path.stem,
                    status="completed",
                    started=path.stem,
                    preview=text.strip()[:500],
                    errors=["### Errors" in text] if False else [],
                )
            )
            if "### Errors" in text:
                runs[-1].errors = ["see run note"]
        return runs

    def _load_doc_index(self) -> list[dict[str, Any]]:
        import json

        if not self._doc_index.exists():
            return []
        data = json.loads(self._doc_index.read_text(encoding="utf-8"))
        return list(data) if isinstance(data, list) else []

    def _save_doc_index(self, rows: list[dict[str, Any]]) -> None:
        import json

        self._doc_index.parent.mkdir(parents=True, exist_ok=True)
        self._doc_index.write_text(json.dumps(rows, indent=2), encoding="utf-8")


def _meta_to_dict(meta: DocumentMeta) -> dict[str, Any]:
    return {
        "id": meta.id,
        "kind": meta.kind,
        "label": meta.label,
        "mime": meta.mime,
        "word_count": meta.word_count,
        "active_cv": meta.active_cv,
        "active_voice": meta.active_voice,
        "created_at": meta.created_at,
        "updated_at": meta.updated_at,
        "original_name": meta.original_name,
    }
