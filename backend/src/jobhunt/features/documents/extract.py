"""Plain-text extraction from uploaded documents.

Purpose: Turn PDF/DOCX/text uploads into ``extracted.txt`` for match/write.
Inputs: Filename, MIME type, raw bytes.
Returns: ``ExtractResult`` (text + status). Optional deps ``pypdf`` / ``python-docx``.
Does not: Return file bytes to list APIs or crawl URLs inside the file.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ExtractStatus = Literal["ok", "empty", "unsupported", "error"]


@dataclass(frozen=True)
class ExtractResult:
    """Outcome of one extract attempt."""

    text: str
    status: ExtractStatus


def extract_document_text(*, filename: str, mime: str, raw: bytes) -> ExtractResult:
    """Extract plain text from an upload.

    Purpose: Shared by POST /documents and store adapters.
    Inputs: Original filename, declared MIME, file bytes.
    Returns: Text (may be empty) and a status for the API/UI contract.
    Does not: Persist files or return CV bodies to list endpoints.
    """

    name = (filename or "").lower()
    mime_l = (mime or "").lower()

    if mime_l.startswith("text/") or name.endswith((".md", ".txt")):
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            return ExtractResult("", "error")
        text = text.strip()
        return ExtractResult(text, "ok" if text else "empty")

    if mime_l == "application/pdf" or name.endswith(".pdf"):
        return _from_pdf(raw)

    if (
        mime_l
        in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }
        or name.endswith((".docx", ".doc"))
    ):
        if name.endswith(".doc") and not name.endswith(".docx"):
            # Legacy .doc needs a different stack; treat as unsupported for now.
            return ExtractResult("", "unsupported")
        return _from_docx(raw)

    return ExtractResult("", "unsupported")


def _from_pdf(raw: bytes) -> ExtractResult:
    try:
        from pypdf import PdfReader  # type: ignore[import-not-found]
    except ImportError:
        return ExtractResult("", "unsupported")
    try:
        from io import BytesIO

        reader = PdfReader(BytesIO(raw))
        parts: list[str] = []
        for page in reader.pages:
            chunk = page.extract_text() or ""
            if chunk.strip():
                parts.append(chunk)
        text = "\n".join(parts).strip()
        return ExtractResult(text, "ok" if text else "empty")
    except Exception:
        return ExtractResult("", "error")


def _from_docx(raw: bytes) -> ExtractResult:
    try:
        from docx import Document  # type: ignore[import-not-found]
    except ImportError:
        return ExtractResult("", "unsupported")
    try:
        from io import BytesIO

        doc = Document(BytesIO(raw))
        parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]

        # Extract text from table cells
        for table in doc.tables:
            for row in table.rows:
                row_parts = []
                prev_cell_text = ""
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    # Skip empty cells and merged cells (same text as previous)
                    if cell_text and cell_text != prev_cell_text:
                        row_parts.append(cell_text)
                        prev_cell_text = cell_text
                if row_parts:
                    parts.append(" ".join(row_parts))

        text = "\n".join(parts).strip()
        return ExtractResult(text, "ok" if text else "empty")
    except Exception:
        return ExtractResult("", "error")
