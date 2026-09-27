"""Document library HTTP routes (Vault UI).

Purpose: Upload/list/patch/delete user context documents without Obsidian.
Inputs: Multipart uploads and metadata patches via AppStore.
Returns: Document metadata only on list/get; optional text/file endpoints.
Does not: Return API keys, crawl uploaded URLs, or render CV in list responses.
"""

from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict

from jobhunt.api.app import get_app_store
from jobhunt.store.types import DocumentKind, DocumentMeta

router = APIRouter(tags=["documents"])

_MAX_UPLOAD_BYTES = 8 * 1024 * 1024
_KINDS = frozenset({"cv", "voice", "cert", "portfolio", "inbox", "other"})


class DocumentOut(BaseModel):
    """Document metadata for the Vault UI."""

    model_config = ConfigDict(extra="forbid")

    id: str
    kind: str
    label: str
    mime: str = "application/octet-stream"
    word_count: int = 0
    active_cv: bool = False
    active_voice: bool = False
    created_at: str = ""
    updated_at: str = ""
    original_name: str = ""
    extract_status: str = "empty"


class DocumentPatch(BaseModel):
    """PATCH body for document metadata."""

    model_config = ConfigDict(extra="forbid")

    label: str | None = None
    kind: DocumentKind | None = None
    active_cv: bool | None = None
    active_voice: bool | None = None


def _out(meta: DocumentMeta) -> DocumentOut:
    return DocumentOut(
        id=meta.id,
        kind=meta.kind,
        label=meta.label,
        mime=meta.mime,
        word_count=meta.word_count,
        active_cv=meta.active_cv,
        active_voice=meta.active_voice,
        created_at=meta.created_at,
        updated_at=meta.updated_at,
        original_name=meta.original_name,
        extract_status=meta.extract_status,
    )


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(
    request: Request,
    kind: str | None = None,
) -> list[DocumentOut]:
    """List document metadata (no bodies)."""

    if kind is not None and kind not in _KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {sorted(_KINDS)}")
    store = get_app_store(request)
    return [_out(d) for d in store.list_documents(kind)]  # type: ignore[arg-type]


@router.post("/documents", response_model=DocumentOut)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    kind: str = Form("other"),
    label: str = Form(""),
    active_cv: bool = Form(False),
    active_voice: bool = Form(False),
) -> DocumentOut:
    """Upload a document into the store."""

    if kind not in _KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {sorted(_KINDS)}")
    raw = await file.read()
    if len(raw) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 8 MiB limit")
    name = file.filename or "upload.bin"
    mime = file.content_type or "application/octet-stream"
    from jobhunt.features.documents import extract_document_text

    result = extract_document_text(filename=name, mime=mime, raw=raw)
    store = get_app_store(request)
    meta = store.add_document(
        kind=kind,  # type: ignore[arg-type]
        label=label.strip() or name,
        original_name=name,
        mime=mime,
        raw=raw,
        extracted_text=result.text,
        extract_status=result.status,
        active_cv=active_cv,
        active_voice=active_voice,
    )
    return _out(meta)


@router.get("/documents/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, request: Request) -> DocumentOut:
    store = get_app_store(request)
    meta = store.get_document(doc_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _out(meta)


@router.get("/documents/{doc_id}/text")
def get_document_text(doc_id: str, request: Request) -> PlainTextResponse:
    """Return extracted text for in-app use (not for Memory list rendering of CV)."""

    store = get_app_store(request)
    text = store.document_text(doc_id)
    if text is None:
        raise HTTPException(status_code=404, detail="Text not available")
    return PlainTextResponse(text)


@router.get("/documents/{doc_id}/file")
def download_document(doc_id: str, request: Request) -> FileResponse:
    store = get_app_store(request)
    path = store.document_file_path(doc_id)
    if path is None or not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    meta = store.get_document(doc_id)
    filename = meta.original_name if meta else path.name
    return FileResponse(path, filename=filename)


@router.patch("/documents/{doc_id}", response_model=DocumentOut)
def patch_document(doc_id: str, body: DocumentPatch, request: Request) -> DocumentOut:
    store = get_app_store(request)
    meta = store.patch_document(
        doc_id,
        label=body.label,
        kind=body.kind,
        active_cv=body.active_cv,
        active_voice=body.active_voice,
    )
    if meta is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return _out(meta)


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str, request: Request) -> dict[str, bool]:
    store = get_app_store(request)
    ok = store.delete_document(doc_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"deleted": True}
