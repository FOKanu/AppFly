import { useState, type ReactNode } from "react";
import { Chip } from "../../shared/ui/Chip";
import { Tag } from "../../shared/ui/Tag";
import { downloadUrl, formatBytes, formatUpdated } from "./api";
import { DOCUMENT_KINDS, activeFlagFor, isActive, type VaultDocument } from "./types";

/** Same wording as CvPicker: why the writer cannot read this file. Null when readable. */
function extractNote(document: VaultDocument): string | null {
  if (document.extract_status === "empty") return "no readable text";
  if (document.extract_status === "unsupported") return "file type not supported";
  if (document.extract_status === "error") return "text extraction failed";
  return null;
}

interface DocumentTableProps {
  documents: VaultDocument[];
  /** False while the store is unreachable, so actions say why. */
  enabled: boolean;
  disabledReason: string;
  busyId: string | null;
  onRename: (document: VaultDocument, label: string) => void;
  onDelete: (document: VaultDocument) => void;
  onSetActive: (document: VaultDocument) => void;
}

/**
 * Purpose: The files AppFly holds — name, type, size, last change, actions.
 * Does not: render any document body. Only the metadata the list endpoint
 *           returns appears here, so a CV's text never reaches this table.
 */
export function DocumentTable({
  documents,
  enabled,
  disabledReason,
  busyId,
  onRename,
  onDelete,
  onSetActive,
}: DocumentTableProps) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startRename(document: VaultDocument) {
    setRenaming(document.id);
    setDraft(document.label);
  }

  function commitRename(document: VaultDocument) {
    const next = draft.trim();
    setRenaming(null);
    if (next && next !== document.label) onRename(document, next);
  }

  return (
    <div className="doc-table" role="table" aria-label="Stored files">
      <div className="doc-table__row doc-table__row--head" role="row">
        <span role="columnheader">Name</span>
        <span role="columnheader">Type</span>
        <span role="columnheader">Size</span>
        <span role="columnheader">Updated</span>
        <span role="columnheader" className="doc-table__actions-head">
          Actions
        </span>
      </div>

      {documents.map((document) => {
        const busy = busyId === document.id;
        const kind = DOCUMENT_KINDS.find((entry) => entry.value === document.kind);
        const inert = !enabled || busy;
        return (
          <div className="doc-table__row" role="row" key={document.id} data-busy={busy}>
            <span role="cell" className="doc-table__name">
              {renaming === document.id ? (
                <input
                  className="doc-table__rename"
                  value={draft}
                  autoFocus
                  aria-label={`Rename ${document.label}`}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commitRename(document)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename(document);
                    if (event.key === "Escape") setRenaming(null);
                  }}
                />
              ) : (
                <>
                  <span className="doc-table__label" title={document.label}>
                    {document.label}
                  </span>
                  {isActive(document) ? <Chip tone="accent">active</Chip> : null}
                  {extractNote(document) ? (
                    <span className="upload__note upload__note--blocked">{extractNote(document)}</span>
                  ) : null}
                </>
              )}
            </span>

            <span role="cell">
              <Tag>{kind?.label ?? document.kind}</Tag>
            </span>
            <span role="cell" className="doc-table__mono">
              {formatBytes(document.size_bytes)}
              {document.word_count !== undefined ? (
                <span className="doc-table__words">
                  {document.word_count.toLocaleString()} w
                </span>
              ) : null}
            </span>
            <span role="cell" className="doc-table__mono">
              {formatUpdated(document.updated_at)}
            </span>

            <span role="cell" className="doc-table__actions">
              {activeFlagFor(document.kind) && !isActive(document) ? (
                <IconAction
                  label={`Make ${document.label} the active ${document.kind === "cv" ? "CV" : "voice sample"}`}
                  disabled={inert}
                  disabledReason={disabledReason}
                  onClick={() => onSetActive(document)}
                >
                  <path d="M8 2.5 9.7 6l3.8.6-2.7 2.7.6 3.7L8 11.2l-3.4 1.8.6-3.7L2.5 6.6 6.3 6 8 2.5Z" />
                </IconAction>
              ) : null}

              <IconAction
                label={`Rename ${document.label}`}
                disabled={inert}
                disabledReason={disabledReason}
                onClick={() => startRename(document)}
              >
                <path d="M11 2.8 13.2 5 5.7 12.5l-2.9.7.7-2.9 7.5-7.5Z" />
              </IconAction>

              {enabled ? (
                <a
                  className="doc-action"
                  href={downloadUrl(document.id)}
                  download={document.label}
                  title={`Download ${document.label}`}
                  aria-label={`Download ${document.label}`}
                >
                  <ActionGlyph>
                    <path d="M8 2.5v7m0 0L5.5 7M8 9.5 10.5 7M3 12.5h10" />
                  </ActionGlyph>
                </a>
              ) : (
                <IconAction
                  label={`Download ${document.label}`}
                  disabled
                  disabledReason={disabledReason}
                  onClick={() => undefined}
                >
                  <path d="M8 2.5v7m0 0L5.5 7M8 9.5 10.5 7M3 12.5h10" />
                </IconAction>
              )}

              <IconAction
                label={`Delete ${document.label}`}
                disabled={inert}
                disabledReason={disabledReason}
                tone="danger"
                onClick={() => onDelete(document)}
              >
                <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8h4.8l.6-8M7 7v3.5M9 7v3.5" />
              </IconAction>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Purpose: One compact row action. Text buttons starved the filename column,
 *          so each action is an icon with an accessible label and a tooltip.
 */
function IconAction({
  label,
  disabled,
  disabledReason,
  tone,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  disabledReason: string;
  tone?: "danger";
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={tone === "danger" ? "doc-action doc-action--danger" : "doc-action"}
      aria-label={label}
      title={disabled ? disabledReason : label}
      disabled={disabled}
      onClick={onClick}
    >
      <ActionGlyph>{children}</ActionGlyph>
    </button>
  );
}

function ActionGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
