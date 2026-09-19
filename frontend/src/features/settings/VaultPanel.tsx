import { useEffect, useState, type FormEvent } from "react";
import type { VaultView } from "./types";

export type VaultPanelProps = {
  vault: VaultView;
  disabled?: boolean;
  onSavePath: (path: string) => Promise<void>;
};

/**
 * Obsidian vault path plus placeholder stats (notes / last scout-match-write).
 */
export function VaultPanel({ vault, disabled = false, onSavePath }: VaultPanelProps) {
  const [path, setPath] = useState(vault.path);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPath(vault.path);
  }, [vault.path]);

  async function handleBrowse() {
    const picker = (
      window as Window & {
        showDirectoryPicker?: () => Promise<{ name: string }>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      setHint("Paste the absolute vault path. Native Browse ships with the Mac app.");
      document.getElementById("vault-path")?.focus();
      return;
    }
    try {
      const dir = await picker();
      setPath(dir.name);
      setHint("Browsers only expose the folder name. Replace with the full path if needed.");
    } catch {
      /* user cancelled */
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSavePath(path);
    } catch {
      setError("Could not save vault path.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">Local-first storage</p>
      <h2 className="settings-card__title">App data & Obsidian</h2>
      <p className="settingsHint">
        Native installs store jobs and documents under the AppFly data directory. Obsidian is
        optional — import from the Vault page if you already have a markdown vault.
      </p>
      <form className="vaultForm" onSubmit={handleSubmit}>
        <label htmlFor="vault-path">Obsidian vault path (import source)</label>
        <div className="settingsActions">
          <input
            id="vault-path"
            name="vault-path"
            type="text"
            autoComplete="off"
            placeholder="~/Documents/Job Search"
            value={path}
            disabled={disabled || busy}
            onChange={(event) => setPath(event.target.value)}
          />
          <button type="button" onClick={handleBrowse} disabled={disabled || busy}>
            Browse
          </button>
          <button type="submit" disabled={disabled || busy || !path.trim()}>
            Save path
          </button>
        </div>
      </form>
      {hint ? <p className="settingsHint">{hint}</p> : null}
      {error ? (
        <p className="settingsError" role="alert">
          {error}
        </p>
      ) : null}
      <dl className="vault-tiles">
        <Tile label="Jobs" value={vault.jobNotes} unit="notes" />
        <Tile label="Companies" value={vault.companyNotes} unit="notes" />
        <Tile label="Letters" value={vault.letterDrafts} unit="drafts" />
        <Tile label="Runs" value={vault.runLogs} unit="logs" />
      </dl>

      <p className="settings-card__copy">
        Home.md, CV/, and Requirements.md live in this vault and are the single source of
        truth — the app reads and writes here directly, nothing is duplicated server-side.
      </p>

      <p className="vault-lastrun">
        last scout {vault.lastScout} · last match {vault.lastMatch} · last write{" "}
        {vault.lastWrite}
      </p>
    </article>
  );
}

/** One boxed vault counter, with an em dash when the API has not sent it. */
function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="vault-tile">
      <dt>{label}</dt>
      <dd>
        {value} <span className="vault-tile__unit">{unit}</span>
      </dd>
    </div>
  );
}
