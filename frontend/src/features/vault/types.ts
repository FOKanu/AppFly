/**
 * Purpose: Shapes for the Vault — the files AppFly owns natively.
 * Does not: carry document bodies. List views hold metadata only, so a CV's
 *           text never reaches the table, Memory, or Profiles.
 */

/** What a stored file is for. */
export type DocumentKind = "cv" | "voice" | "certification" | "portfolio" | "clip";

/** Display order and labels for the kind filter. */
export const DOCUMENT_KINDS: { value: DocumentKind; label: string; hint: string }[] = [
  { value: "cv", label: "CV", hint: "Given to the writer as your history" },
  { value: "voice", label: "Voice sample", hint: "Steers the tone of letters" },
  { value: "certification", label: "Certification", hint: "Licences and credentials" },
  { value: "portfolio", label: "Portfolio", hint: "Case studies and work samples" },
  { value: "clip", label: "Inbox clip", hint: "A listing you saved yourself" },
];

/**
 * One row of `GET /documents`. Metadata only — the contract deliberately has
 * no body field, so a list response can never leak a CV.
 */
export interface VaultDocument {
  id: string;
  kind: DocumentKind;
  label: string;
  mime: string;
  /** Bytes on disk, when the backend reports it. */
  size_bytes?: number;
  /** Words in the extracted text, for documents the writer reads. */
  word_count?: number;
  /** ISO timestamp of the last write. */
  updated_at?: string;
  /** True for the CV currently handed to the writer. One per kind at most. */
  active?: boolean;
}

/**
 * Whether the documents API is actually serving. The endpoints are specified
 * but not yet built, so the UI must be able to say so rather than silently
 * dropping an upload.
 */
export type VaultAvailability = "live" | "unavailable";

export interface VaultSnapshot {
  documents: VaultDocument[];
  availability: VaultAvailability;
}

/** Where AppFly keeps its own files, and whether that location is ready. */
export interface WorkspaceStatus {
  /** Absolute path to the native app-data directory. */
  path: string;
  initialised: boolean;
  documentCount: number;
  /** True once an Obsidian vault has been imported at least once. */
  importedFromObsidian: boolean;
}
