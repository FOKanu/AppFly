/**
 * Purpose: Shapes for the Vault — the files AppFly owns natively.
 * Does not: carry document bodies. List views hold metadata only, so a CV's
 *           text never reaches the table, Memory, or Profiles.
 */

/**
 * What a stored file is for. These match `DocumentKind` in
 * `backend/src/jobhunt/store/types.py` exactly — the store rejects anything else.
 */
export type DocumentKind = "cv" | "voice" | "cert" | "portfolio" | "inbox" | "other";

/** Display order and labels for the kind filter. */
export const DOCUMENT_KINDS: { value: DocumentKind; label: string; hint: string }[] = [
  { value: "cv", label: "CV", hint: "Given to the writer as your history" },
  { value: "voice", label: "Voice sample", hint: "Steers the tone of letters" },
  { value: "cert", label: "Certification", hint: "Licences and credentials" },
  { value: "portfolio", label: "Portfolio", hint: "Case studies and work samples" },
  { value: "inbox", label: "Inbox clip", hint: "A listing you saved yourself" },
  { value: "other", label: "Other", hint: "Anything else worth keeping" },
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
  /**
   * Bytes on disk. `DocumentOut` does not carry it yet, so the table shows an
   * em dash until the store reports it.
   */
  size_bytes?: number;
  /** Words in the extracted text, for documents the writer reads. */
  word_count?: number;
  /** ISO timestamps from the store. */
  created_at?: string;
  updated_at?: string;
  /** Filename as uploaded, before any rename. */
  original_name?: string;
  /**
   * The store tracks the active CV and the active voice sample separately,
   * so these are two flags rather than one.
   */
  active_cv?: boolean;
  active_voice?: boolean;
}

/** Which active flag a kind uses, or null when the kind has none. */
export function activeFlagFor(kind: DocumentKind): "active_cv" | "active_voice" | null {
  if (kind === "cv") return "active_cv";
  if (kind === "voice") return "active_voice";
  return null;
}

/** Purpose: Whether this document is the one its kind hands to the writer. */
export function isActive(document: VaultDocument): boolean {
  return Boolean(document.active_cv || document.active_voice);
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

/**
 * Where AppFly keeps its own files, and what is still missing.
 * Mirrors `InitResponse` in backend/src/jobhunt/api/routes/workspace.py.
 */
export interface WorkspaceStatus {
  /** "native" uses the app-data dir; "markdown" uses the Obsidian vault. */
  storage_backend: "native" | "markdown" | string;
  /** Absolute path to the store this install actually uses. */
  data_path: string;
  has_cv: boolean;
  has_voice: boolean;
  has_gemini: boolean;
  has_keywords: boolean;
  job_count: number;
}
