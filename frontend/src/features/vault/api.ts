/**
 * Purpose: Typed client for /documents and workspace endpoints.
 * Does not: Render CV bodies or store API keys.
 */

import { apiBaseUrl } from "../../shared/api/client";

export type DocumentKind = "cv" | "voice" | "cert" | "portfolio" | "inbox" | "other";

export interface DocumentMeta {
  id: string;
  kind: DocumentKind | string;
  label: string;
  mime: string;
  word_count: number;
  active_cv: boolean;
  active_voice: boolean;
  created_at: string;
  updated_at: string;
  original_name: string;
}

export interface WorkspaceStatus {
  storage_backend: string;
  data_path: string;
  has_cv: boolean;
  has_voice: boolean;
  has_gemini: boolean;
  has_keywords: boolean;
  job_count: number;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return (await response.json()) as T;
}

/**
 * Purpose: List document metadata from GET /documents.
 */
export async function listDocuments(kind?: DocumentKind): Promise<DocumentMeta[]> {
  const url = new URL("/documents", apiBaseUrl());
  if (kind) url.searchParams.set("kind", kind);
  const response = await fetch(url);
  return parseJson<DocumentMeta[]>(response);
}

/**
 * Purpose: Multipart upload to POST /documents.
 */
export async function uploadDocument(input: {
  file: File;
  kind: DocumentKind;
  label?: string;
  active_cv?: boolean;
  active_voice?: boolean;
}): Promise<DocumentMeta> {
  const body = new FormData();
  body.append("file", input.file);
  body.append("kind", input.kind);
  body.append("label", input.label ?? input.file.name);
  body.append("active_cv", String(Boolean(input.active_cv)));
  body.append("active_voice", String(Boolean(input.active_voice)));
  const response = await fetch(new URL("/documents", apiBaseUrl()), {
    method: "POST",
    body,
  });
  return parseJson<DocumentMeta>(response);
}

export async function patchDocument(
  id: string,
  patch: Partial<Pick<DocumentMeta, "label" | "kind" | "active_cv" | "active_voice">>,
): Promise<DocumentMeta> {
  const response = await fetch(new URL(`/documents/${encodeURIComponent(id)}`, apiBaseUrl()), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJson<DocumentMeta>(response);
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(new URL(`/documents/${encodeURIComponent(id)}`, apiBaseUrl()), {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await response.text());
}

export function documentFileUrl(id: string): string {
  return new URL(`/documents/${encodeURIComponent(id)}/file`, apiBaseUrl()).toString();
}

export async function fetchWorkspaceStatus(): Promise<WorkspaceStatus> {
  const response = await fetch(new URL("/workspace/status", apiBaseUrl()));
  return parseJson<WorkspaceStatus>(response);
}

export async function initWorkspace(): Promise<WorkspaceStatus> {
  const response = await fetch(new URL("/workspace/init", apiBaseUrl()), { method: "POST" });
  return parseJson<WorkspaceStatus>(response);
}

export async function importObsidianVault(vaultPath: string): Promise<unknown> {
  const response = await fetch(new URL("/workspace/import/obsidian", apiBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vault_path: vaultPath }),
  });
  return parseJson(response);
}
