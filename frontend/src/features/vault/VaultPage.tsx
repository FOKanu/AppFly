/**
 * Purpose: AppFly Vault — local document library (no Obsidian required).
 * Does not: Render CV markdown bodies in the table; crawl listing URLs.
 */

import { useCallback, useEffect, useState } from "react";
import {
  deleteDocument,
  documentFileUrl,
  fetchWorkspaceStatus,
  importObsidianVault,
  initWorkspace,
  listDocuments,
  patchDocument,
  uploadDocument,
  type DocumentKind,
  type DocumentMeta,
  type WorkspaceStatus,
} from "./api";
import "./vault.css";

const KINDS: DocumentKind[] = ["cv", "voice", "cert", "portfolio", "inbox", "other"];

/**
 * Purpose: File management page for user context documents.
 */
export function VaultPage() {
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<DocumentKind>("cv");
  const [importPath, setImportPath] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [documents, workspace] = await Promise.all([
        listDocuments(),
        fetchWorkspaceStatus().catch(() => null),
      ]);
      setDocs(documents);
      setStatus(workspace);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vault");
      setDocs([]);
    }
  }, []);

  useEffect(() => {
    document.title = "AppFly · Vault";
    void reload();
  }, [reload]);

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setNote(null);
    try {
      for (const file of Array.from(fileList)) {
        await uploadDocument({
          file,
          kind,
          active_cv: kind === "cv" && !docs.some((d) => d.active_cv),
          active_voice: kind === "voice" && !docs.some((d) => d.active_voice),
        });
      }
      setNote("Uploaded.");
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSetActive(doc: DocumentMeta) {
    setBusy(true);
    try {
      if (doc.kind === "cv") await patchDocument(doc.id, { active_cv: true });
      if (doc.kind === "voice") await patchDocument(doc.id, { active_voice: true });
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(doc: DocumentMeta) {
    if (!window.confirm(`Delete “${doc.label}”?`)) return;
    setBusy(true);
    try {
      await deleteDocument(doc.id);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-page">
      {error ? (
        <p className="vault-page__banner" role="alert">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="vault-page__banner" role="status">
          {note}
        </p>
      ) : null}

      <section className="vault-card" aria-labelledby="vault-lib-title">
        <header className="vault-card__head">
          <div>
            <p className="vault-card__kicker">Local library</p>
            <h2 id="vault-lib-title" className="vault-card__title">
              Vault
            </h2>
            <p className="vault-card__lede">
              Upload CV, voice samples, certs, and clips. AppFly stores them locally — Obsidian is
              optional import only.
            </p>
          </div>
          {status ? (
            <dl className="vault-status">
              <div>
                <dt>Backend</dt>
                <dd>{status.storage_backend}</dd>
              </div>
              <div>
                <dt>Data path</dt>
                <dd title={status.data_path}>{status.data_path}</dd>
              </div>
            </dl>
          ) : null}
        </header>

        <div className="vault-upload">
          <label className="vault-upload__kind">
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)} disabled={busy}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label className="vault-upload__drop">
            <input
              type="file"
              multiple
              disabled={busy}
              onChange={(e) => void onUpload(e.target.files)}
            />
            <span>Drop files or click to upload</span>
          </label>
          <button type="button" className="vault-btn" disabled={busy} onClick={() => void initWorkspace().then(reload)}>
            Init workspace
          </button>
        </div>

        {docs.length === 0 ? (
          <p className="vault-empty">No documents yet. Upload a CV to unlock matching and letters.</p>
        ) : (
          <table className="vault-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Words</th>
                <th>Flags</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="vault-table__name">{doc.label}</span>
                    <span className="vault-table__file">{doc.original_name}</span>
                  </td>
                  <td>{doc.kind}</td>
                  <td>{doc.word_count || "—"}</td>
                  <td>
                    {doc.active_cv ? <span className="vault-chip">active CV</span> : null}
                    {doc.active_voice ? <span className="vault-chip">active voice</span> : null}
                  </td>
                  <td>{doc.updated_at || "—"}</td>
                  <td className="vault-table__actions">
                    {doc.kind === "cv" && !doc.active_cv ? (
                      <button type="button" disabled={busy} onClick={() => void onSetActive(doc)}>
                        Set active CV
                      </button>
                    ) : null}
                    {doc.kind === "voice" && !doc.active_voice ? (
                      <button type="button" disabled={busy} onClick={() => void onSetActive(doc)}>
                        Set active voice
                      </button>
                    ) : null}
                    <a href={documentFileUrl(doc.id)} download={doc.original_name}>
                      Download
                    </a>
                    <button type="button" disabled={busy} onClick={() => void onDelete(doc)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="vault-card" aria-labelledby="vault-import-title">
        <p className="vault-card__kicker">Optional</p>
        <h2 id="vault-import-title" className="vault-card__title">
          Import Obsidian vault
        </h2>
        <p className="vault-card__lede">
          One-shot copy into the native store. Does not keep two live writers.
        </p>
        <form
          className="vault-import"
          onSubmit={(e) => {
            e.preventDefault();
            void (async () => {
              setBusy(true);
              try {
                await importObsidianVault(importPath.trim());
                setNote("Import finished.");
                await reload();
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Import failed");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <input
            type="text"
            placeholder="~/Documents/Job Search"
            value={importPath}
            onChange={(e) => setImportPath(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !importPath.trim()}>
            Import
          </button>
        </form>
      </section>
    </div>
  );
}
