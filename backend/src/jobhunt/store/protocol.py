"""Store protocols for jobs, letters, documents, runs, and requirements.

Purpose: Decouple scout/match/write/API from Markdown vs SQLite.
Inputs: Implemented by MarkdownVaultStore and SqliteStore.
Returns: Protocol types only.
Does not: Perform I/O.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable

from jobhunt.models import Job, Requirements
from jobhunt.store.types import DocumentKind, DocumentMeta, JobNote, LetterRecord, RunRecord


@runtime_checkable
class AppStore(Protocol):
    """Unified workspace store used by the pipeline and HTTP API.

    Purpose: One façade for native SQLite and markdown vault backends.
    Inputs: Constructed via ``get_store(config)``.
    Returns: Methods below.
    Does not: Crawl deny-listed hosts or return API keys.
    """

    backend_name: str

    def ensure_dirs(self) -> None: ...

    def data_path(self) -> Path: ...

    # --- jobs (pipeline-compatible) ---
    def existing_source_ids(self) -> set[str]: ...

    def upsert_job(self, job: Job, *, status: str = "inbox") -> Path: ...

    def iter_job_notes(self) -> list[JobNote]: ...

    def job_from_note(self, post: JobNote) -> Job: ...

    def update_job_meta(self, source_id: str, **updates: object) -> Path | None: ...

    def find_job_path(self, source_id: str) -> Path | None: ...

    @property
    def inbox_dir(self) -> Path: ...

    # --- requirements / CV / voice ---
    def load_requirements(self) -> Requirements: ...

    def save_requirements(self, requirements: Requirements) -> None: ...

    def read_cv(self) -> str: ...

    def read_voice_samples(self) -> str: ...

    def read_company_body(self, company: str) -> str: ...

    # --- letters ---
    def write_letter(
        self,
        job: Job,
        body: str,
        *,
        model: str,
        tokens_in: int,
        tokens_out: int,
    ) -> Path: ...

    def get_letter(self, source_id: str) -> LetterRecord | None: ...

    def save_letter_body(self, source_id: str, body: str) -> LetterRecord: ...

    # --- documents ---
    def list_documents(self, kind: DocumentKind | None = None) -> list[DocumentMeta]: ...

    def get_document(self, doc_id: str) -> DocumentMeta | None: ...

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
    ) -> DocumentMeta: ...

    def patch_document(self, doc_id: str, **updates: object) -> DocumentMeta | None: ...

    def delete_document(self, doc_id: str) -> bool: ...

    def document_text(self, doc_id: str) -> str | None: ...

    def document_file_path(self, doc_id: str) -> Path | None: ...

    # --- runs / home ---
    def regenerate_home(self, *, last_run: str = "") -> Path: ...

    def append_run_note(self, day: str, body: str) -> Path: ...

    def list_run_notes(self) -> list[RunRecord]: ...
