import { useEffect, useRef, useState, type DragEvent } from "react";
import { DOCUMENT_KINDS, type DocumentKind } from "./types";

interface UploadZoneProps {
  onUpload: (files: File[], kind: DocumentKind) => void;
  /** False while the store is unreachable, so the control says why. */
  enabled: boolean;
  disabledReason: string;
  busy: boolean;
  /** Prefill the kind select (e.g. from `?kind=cert` deep links). */
  initialKind?: DocumentKind;
}

/**
 * Purpose: Drop or pick files to add them to AppFly's own storage.
 * Does not: read file contents in the browser — the File objects go straight
 *           to the upload request as multipart.
 */
export function UploadZone({
  onUpload,
  enabled,
  disabledReason,
  busy,
  initialKind = "cv",
}: UploadZoneProps) {
  const [kind, setKind] = useState<DocumentKind>(initialKind);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);

  function accept(files: FileList | null) {
    if (!enabled || !files || files.length === 0) return;
    onUpload(Array.from(files), kind);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files);
  }

  const hint = DOCUMENT_KINDS.find((entry) => entry.value === kind)?.hint ?? "";

  return (
    <section id="upload" className="upload" aria-labelledby="upload-title">
      <div className="upload__head">
        <div>
          <p className="upload__kicker">Add to vault</p>
          <h2 id="upload-title" className="upload__title">
            Upload a file
          </h2>
        </div>
        <label className="upload__kind">
          <span className="menu__sr-only">File type</span>
          <select
            value={kind}
            disabled={!enabled}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
          >
            {DOCUMENT_KINDS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className={["upload__zone", dragging ? "is-dragging" : "", enabled ? "" : "is-disabled"]
          .filter(Boolean)
          .join(" ")}
        title={enabled ? undefined : disabledReason}
        onDragOver={(event) => {
          if (!enabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg
          className="upload__glyph"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4m0 0L8 8m4-4 4 4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
        </svg>

        <p className="upload__copy">
          {busy ? "Uploading…" : "Drop a file here, or"}{" "}
          {busy ? null : (
            <button
              type="button"
              className="upload__browse"
              disabled={!enabled}
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          )}
        </p>
        <p className="upload__hint">{hint}</p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="menu__sr-only"
          aria-label="Choose files to upload"
          disabled={!enabled}
          onChange={(event) => {
            accept(event.target.files);
            // Allow re-picking the same file straight after.
            event.target.value = "";
          }}
        />
      </div>

      {enabled ? (
        <p className="upload__note">
          Files are copied into AppFly's own storage on this machine. Nothing is uploaded to a
          server.
        </p>
      ) : (
        <p className="upload__note upload__note--blocked">{disabledReason}</p>
      )}
    </section>
  );
}
