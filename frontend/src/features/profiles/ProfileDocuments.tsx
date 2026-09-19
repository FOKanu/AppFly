import { Button } from "../../shared/ui/Button";
import { NOT_PERSISTED_NOTE } from "./api";
import type { ProfileDocument } from "./types";

interface ProfileDocumentsProps {
  documents: ProfileDocument[];
  vaultPath: string;
  onCopyPath: (path: string) => void;
}

/**
 * Purpose: The documents the writer may be given — CV, voice sample, and the
 *          credential slots the vault does not model yet.
 * Does not: render any document body. Paths, presence and counts only, so the
 *           CV never reaches the DOM.
 */
export function ProfileDocuments({
  documents,
  vaultPath,
  onCopyPath,
}: ProfileDocumentsProps) {
  return (
    <section className="profile-card" id="documents" aria-labelledby="documents-title">
      <header className="profile-card__head">
        <div>
          <p className="profile-card__kicker">Documents &amp; credentials</p>
          <h2 id="documents-title" className="profile-card__title">
            What the writer is given
          </h2>
        </div>
        <span className="profile-card__saved">paths only</span>
      </header>

      <ul className="doc-list">
        {documents.map((doc) => (
          <li className="doc-row" key={doc.id} data-present={doc.present}>
            <span className="doc-row__dot" aria-hidden="true" />
            <span className="doc-row__col">
              <span className="doc-row__label">{doc.label}</span>
              <span className="doc-row__path">{doc.path}</span>
            </span>
            <span className="doc-row__state">
              {doc.present ? (doc.detail ?? "present") : "missing"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyPath(`${vaultPath}/${doc.path}`)}
            >
              Copy path
            </Button>
          </li>
        ))}
      </ul>

      <div className="doc-actions">
        <Button variant="quiet" disabled title={NOT_PERSISTED_NOTE}>
          Add certification / license
        </Button>
        <Button variant="quiet" disabled title={NOT_PERSISTED_NOTE}>
          Add portfolio / case study
        </Button>
      </div>
      <p className="profile-card__note">
        The copilot reads these straight from the vault on this machine. Edit them in Obsidian;
        this screen never loads their contents.
      </p>
    </section>
  );
}

/**
 * Purpose: Describe the documents the vault is expected to hold.
 * Inputs: Health flags from GET /settings — the API reports presence, not size.
 * Does not: read the files.
 */
export function documentsFor(health: {
  cvPresent: boolean;
  requirementsPresent: boolean;
}): ProfileDocument[] {
  return [
    {
      id: "cv",
      kind: "cv",
      label: "CV master",
      path: "CV/Master.md",
      present: health.cvPresent,
      detail: "read by the writer",
    },
    {
      id: "requirements",
      kind: "cv",
      label: "Requirements & guardrails",
      path: "Requirements.md",
      present: health.requirementsPresent,
      detail: "read by the matcher",
    },
    {
      id: "voice",
      kind: "voice",
      label: "Voice samples",
      path: "CV/Voice-samples.md",
      present: false,
      detail: "steers letter tone",
    },
  ];
}
