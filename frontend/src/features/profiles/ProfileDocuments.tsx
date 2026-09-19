import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { Chip } from "../../shared/ui/Chip";
import { Tag } from "../../shared/ui/Tag";
import { ROUTES } from "../../routes";
import { DOCUMENT_KINDS, type DocumentKind, type VaultDocument } from "../vault/types";

interface ProfileDocumentsProps {
  /** Everything in the Vault, so the picker can offer real files. */
  available: VaultDocument[];
  /** Ids currently attached to this profile. */
  attachedIds: string[];
  onAttach: (id: string) => void;
  onDetach: (id: string) => void;
  /** False while the document store is unreachable. */
  enabled: boolean;
  disabledReason: string;
}

/** Kinds a profile can attach. Inbox clips belong to the Queue, not a profile. */
const ATTACHABLE: DocumentKind[] = ["cv", "voice", "certification", "portfolio"];

/**
 * Purpose: Attach files from the Vault to this profile — the CV and voice
 *          sample the writer is given, plus any credentials.
 * Does not: render a document body, and does not send you to Obsidian. Files
 *           live in AppFly's own storage and are managed in the Vault.
 */
export function ProfileDocuments({
  available,
  attachedIds,
  onAttach,
  onDetach,
  enabled,
  disabledReason,
}: ProfileDocumentsProps) {
  const attachable = available.filter((doc) => ATTACHABLE.includes(doc.kind));
  const attached = attachable.filter((doc) => attachedIds.includes(doc.id));
  const unattached = attachable.filter((doc) => !attachedIds.includes(doc.id));

  return (
    <section className="profile-card" id="documents" aria-labelledby="documents-title">
      <header className="profile-card__head">
        <div>
          <p className="profile-card__kicker">Documents &amp; credentials</p>
          <h2 id="documents-title" className="profile-card__title">
            What the writer is given
          </h2>
        </div>
        <Link className="link-action" to={ROUTES.vault}>
          Manage in Vault →
        </Link>
      </header>

      {attached.length === 0 ? (
        <p className="profile-card__empty">
          Nothing attached yet. Pick a CV and a voice sample below, or{" "}
          <Link to={ROUTES.vault}>upload one to the Vault</Link> first.
        </p>
      ) : (
        <ul className="attached-list">
          {attached.map((doc) => (
            <li className="attached-row" key={doc.id}>
              <span className="attached-row__dot" data-kind={doc.kind} aria-hidden="true" />
              <span className="attached-row__col">
                <span className="attached-row__label">{doc.label}</span>
                <span className="attached-row__meta">
                  {kindLabel(doc.kind)}
                  {doc.word_count !== undefined
                    ? ` · ${doc.word_count.toLocaleString()} words`
                    : ""}
                </span>
              </span>
              {doc.active ? <Chip tone="accent">active CV</Chip> : null}
              <Button
                variant="ghost"
                size="sm"
                disabled={!enabled}
                title={enabled ? undefined : disabledReason}
                onClick={() => onDetach(doc.id)}
              >
                Detach
              </Button>
            </li>
          ))}
        </ul>
      )}

      {unattached.length > 0 ? (
        <>
          <p className="profile-label">Available in your vault</p>
          <div className="attach-picker">
            {unattached.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className="attach-chip"
                disabled={!enabled}
                title={enabled ? `Attach ${doc.label}` : disabledReason}
                onClick={() => onAttach(doc.id)}
              >
                <span className="attach-chip__plus" aria-hidden="true">
                  +
                </span>
                {doc.label}
                <Tag>{kindLabel(doc.kind)}</Tag>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <p className="profile-card__note">
        AppFly stores these itself — no Obsidian needed. This screen shows names and word
        counts only; document contents are never loaded here.
      </p>
    </section>
  );
}

function kindLabel(kind: DocumentKind): string {
  return DOCUMENT_KINDS.find((entry) => entry.value === kind)?.label ?? kind;
}
