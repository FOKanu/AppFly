import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../routes";
import { Banner } from "../../shared/ui/Banner";
import { Button } from "../../shared/ui/Button";
import { Segmented } from "../../shared/ui/Segmented";
import { Toast, useToast } from "../../shared/ui/Toast";
import { DocumentTable } from "./DocumentTable";
import { UploadZone } from "./UploadZone";
import {
  deleteDocument,
  getWorkspace,
  listDocuments,
  patchDocument,
  uploadDocument,
} from "./api";
import {
  DOCUMENT_KINDS,
  activeFlagFor,
  type DocumentKind,
  type VaultDocument,
  type WorkspaceStatus,
} from "./types";
import { describeApiError, isUnreachable, type ApiFailure } from "../../shared/api/errors";
import "./vault.css";

/** Kind filter values, with "all" in front of the real kinds. */
const FILTERS = [
  { value: "all" as const, label: "All" },
  ...DOCUMENT_KINDS.map((entry) => ({ value: entry.value, label: entry.label })),
];

type Filter = "all" | DocumentKind;

const KIND_VALUES = new Set(DOCUMENT_KINDS.map((entry) => entry.value));

function filterFromParam(raw: string | null): Filter {
  if (raw && KIND_VALUES.has(raw as DocumentKind)) return raw as DocumentKind;
  return "all";
}

/**
 * Purpose: Vault — the files AppFly owns, without Obsidian. Upload, rename,
 *          set the active CV, download and delete.
 * Does not: render any document body, and does not hold application history —
 *           that stays in Memory.
 */
export function VaultPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hash } = useLocation();
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceStatus | null>(null);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>(() =>
    filterFromParam(searchParams.get("kind")),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.title = "AppFly · Vault";
  }, []);

  // Keep the kind filter in sync with deep links from the profile menu.
  useEffect(() => {
    setFilter(filterFromParam(searchParams.get("kind")));
  }, [searchParams]);

  useEffect(() => {
    if (hash !== "#upload" || loading) return;
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, loading]);

  function onFilterChange(next: Filter) {
    setFilter(next);
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("kind");
    else params.set("kind", next);
    setSearchParams(params, { replace: true });
  }

  const load = useCallback(async () => {
    try {
      const [snapshot, status] = await Promise.all([listDocuments(), getWorkspace()]);
      setDocuments(snapshot.documents);
      setWorkspace(status);
      setFailure(null);
    } catch (error) {
      setDocuments([]);
      setFailure(describeApiError(error, "Loading your files"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === "all" ? documents : documents.filter((doc) => doc.kind === filter)),
    [documents, filter],
  );

  const unreachable = failure !== null && isUnreachable(failure.kind);

  const onUpload = useCallback(
    async (files: File[], kind: DocumentKind) => {
      setUploading(true);
      try {
        const firstOfKind = !documents.some((doc) => doc.kind === kind);
        const added = await Promise.all(
          files.map((file, index) =>
            uploadDocument(file, kind, firstOfKind && index === 0),
          ),
        );
        setDocuments((current) => [...added, ...current]);
        toast.show(
          added.length === 1
            ? `${added[0].label} added to the vault.`
            : `${added.length} files added to the vault.`,
        );
      } catch (error) {
        toast.show(describeApiError(error, "Upload").message);
      } finally {
        setUploading(false);
      }
    },
    [documents, toast],
  );

  const onRename = useCallback(
    async (target: VaultDocument, label: string) => {
      setBusyId(target.id);
      try {
        const updated = await patchDocument(target.id, { label });
        setDocuments((current) =>
          current.map((doc) => (doc.id === target.id ? { ...doc, ...updated } : doc)),
        );
        toast.show(`Renamed to ${label}.`);
      } catch (error) {
        toast.show(describeApiError(error, "Rename").message);
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  const onSetActive = useCallback(
    async (target: VaultDocument) => {
      const flag = activeFlagFor(target.kind);
      if (!flag) return;
      setBusyId(target.id);
      try {
        await patchDocument(target.id, { [flag]: true });
        // One active document per kind, so clear the flag on its siblings.
        setDocuments((current) =>
          current.map((doc) =>
            doc.kind === target.kind ? { ...doc, [flag]: doc.id === target.id } : doc,
          ),
        );
        toast.show(
          `${target.label} is now the active ${target.kind === "cv" ? "CV" : "voice sample"}.`,
        );
      } catch (error) {
        toast.show(describeApiError(error, "Changing the active file").message);
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  const onDelete = useCallback(
    async (target: VaultDocument) => {
      setBusyId(target.id);
      try {
        await deleteDocument(target.id);
        setDocuments((current) => current.filter((doc) => doc.id !== target.id));
        toast.show(`${target.label} deleted.`);
      } catch (error) {
        toast.show(describeApiError(error, "Delete").message);
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  const firstRun = !loading && failure === null && documents.length === 0;

  return (
    <div className="vault" aria-busy={loading || undefined}>
      {failure && failure.kind === "timeout" ? (
        <Banner tone="warning" title="Vault not loaded">
          {failure.message}
        </Banner>
      ) : null}
      {failure && !unreachable ? (
        <Banner tone="danger" title="Vault not loaded">
          {failure.message}
        </Banner>
      ) : null}

      <header className="vault__head">
        <div className="vault__stats">
          <Stat label="Files" value={documents.length} />
          <Stat label="CVs" value={documents.filter((d) => d.kind === "cv").length} />
          <Stat
            label="Credentials"
            value={
              documents.filter((d) => d.kind === "cert" || d.kind === "portfolio").length
            }
          />
        </div>
        <Segmented
          options={FILTERS}
          value={filter}
          onChange={onFilterChange}
          ariaLabel="Filter by file type"
        />
      </header>

      <p className="vault__location">
        Stored in <code>{workspace?.data_path ?? "—"}</code> ·{" "}
        <Link to={ROUTES.settings}>change in Settings</Link>
      </p>

      <div className="vault__columns">
        <UploadZone
          onUpload={(files, kind) => void onUpload(files, kind)}
          enabled={!unreachable}
          disabledReason="Start the local API to upload or change files."
          busy={uploading}
          initialKind={filter === "all" ? "cv" : filter}
        />

        <section className="vault__files" aria-labelledby="files-title">
          <header className="vault__files-head">
            <div>
              <p className="vault__kicker">
                {visible.length} file{visible.length === 1 ? "" : "s"}
              </p>
              <h2 id="files-title" className="vault__title">
                Your files
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </Button>
          </header>

          {unreachable ? (
            <p className="vault__empty">No files to show while the API is offline.</p>
          ) : failure ? null : firstRun ? (
            <FirstRun />
          ) : visible.length === 0 ? (
            <p className="vault__empty">
              No {filter === "all" ? "" : `${filter} `}files yet.
            </p>
          ) : (
            <DocumentTable
              documents={visible}
              enabled={!unreachable}
              disabledReason="Start the local API to upload or change files."
              busyId={busyId}
              onRename={(doc, label) => void onRename(doc, label)}
              onDelete={(doc) => void onDelete(doc)}
              onSetActive={(doc) => void onSetActive(doc)}
            />
          )}

          <p className="vault__note">
            The writer reads the active CV and your voice sample. This list shows names and
            counts only — no document contents are loaded here.
          </p>
        </section>
      </div>

      <Toast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}

/** First-run panel: an empty native store, with the two files that matter. */
function FirstRun() {
  return (
    <div className="vault__firstrun">
      <p className="vault__firstrun-title">Your vault is empty</p>
      <p className="vault__firstrun-copy">
        AppFly keeps your files itself — no Obsidian required. Add a CV to give the writer
        something to work from, and a voice sample so letters sound like you.
      </p>
      <ol className="vault__firstrun-steps">
        <li>
          <span className="vault__step-index">1</span>
          Upload a CV and mark it active
        </li>
        <li>
          <span className="vault__step-index">2</span>
          Add a voice sample — one or two letters you have already sent
        </li>
        <li>
          <span className="vault__step-index">3</span>
          Attach them to a profile in <Link to={ROUTES.profiles}>Profiles</Link>
        </li>
      </ol>
      <p className="vault__firstrun-copy">
        Already have an Obsidian vault? <Link to={ROUTES.settings}>Import it in Settings</Link>.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="vault-stat">
      <span className="vault-stat__label">{label}</span>
      <span className="vault-stat__value">{value.toLocaleString()}</span>
    </div>
  );
}
