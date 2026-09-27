import { apiBaseUrl, apiFetch, apiGet } from "../../shared/api/client";
import { activeFlagFor } from "./types";
import type { DocumentKind, ObsidianImportReport, VaultDocument, VaultSnapshot, WorkspaceStatus } from "./types";

/**
 * Purpose: Client for the native document store.
 * Does not: fetch or render a document body in any list path. `documentText`
 *           exists for a future preview pane and is never called from the
 *           Vault table, Memory, or Profiles.
 */

/**
 * Purpose: List stored documents.
 * Does not: fall back to sample rows. Any failure, including a 404, throws, and the
 *           caller classifies it with describeApiError.
 */
export async function listDocuments(): Promise<VaultSnapshot> {
  const documents = await apiGet<VaultDocument[]>("/documents");
  return { documents, availability: "live" };
}

/**
 * Purpose: Read where AppFly keeps its own files.
 * Does not: create the directory — `initWorkspace` does that on request.
 */
export async function getWorkspace(): Promise<WorkspaceStatus> {
  return apiGet<WorkspaceStatus>("/workspace/status");
}

/**
 * Purpose: Create the native app-data directory on this machine.
 * Does not: touch an Obsidian vault; importing is a separate, explicit step.
 */
export async function initWorkspace(): Promise<WorkspaceStatus> {
  return apiFetch<WorkspaceStatus>("/workspace/init", { method: "POST" });
}

/**
 * Purpose: Copy an existing Obsidian vault into AppFly's own storage, once.
 * Does not: keep the two in sync — this is a one-way import, not a mount.
 */
export async function importObsidianVault(path: string): Promise<ObsidianImportReport> {
  return apiFetch<ObsidianImportReport>("/workspace/import/obsidian", {
    method: "POST",
    body: JSON.stringify({ vault_path: path }),
  });
}

/**
 * Purpose: Upload a file into the store.
 * Inputs: The browser File plus the kind it should be filed under.
 * Does not: read the file in the browser; it is streamed as multipart so a CV
 *           body never enters the React tree.
 */
export async function uploadDocument(
  file: File,
  kind: DocumentKind,
  /** Mark this the active CV/voice sample on upload — used for a first file. */
  makeActive = false,
): Promise<VaultDocument> {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  body.append("label", file.name);
  const flag = activeFlagFor(kind);
  if (makeActive && flag) body.append(flag, "true");
  // Multipart sets its own boundary, so no Content-Type header here.
  return apiFetch<VaultDocument>("/documents", { method: "POST", body });
}

/**
 * Purpose: Rename a document or mark it the active one for its kind.
 * Does not: accept a body — the store owns file contents.
 */
export async function patchDocument(
  id: string,
  patch: { label?: string; kind?: DocumentKind; active_cv?: boolean; active_voice?: boolean },
): Promise<VaultDocument> {
  return apiFetch<VaultDocument>(`/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Purpose: Remove a document from the store. Does not: empty a trash. */
export async function deleteDocument(id: string): Promise<void> {
  await apiFetch<void>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * Purpose: Direct download URL for a stored file.
 * Does not: fetch the bytes — the browser does, via a plain link.
 */
export function downloadUrl(id: string): string {
  return `${apiBaseUrl()}/documents/${encodeURIComponent(id)}/file`;
}

/**
 * Purpose: Extracted text for a single document, for a future preview pane.
 * Does not: get called from any list view. Keeping it out of the table is what
 *           stops a CV body reaching Vault or Memory.
 */
export async function documentText(id: string): Promise<string> {
  const result = await apiGet<{ text: string }>(
    `/documents/${encodeURIComponent(id)}/text`,
  );
  return result.text;
}

/** Purpose: Human file size. Does not: round to a misleading precision. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** Purpose: Short relative date for the table. Does not: invent a timestamp. */
export function formatUpdated(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
