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
    <article className="settingsPanel">
      <header className="settingsPanelHeader">
        <h2>Obsidian vault</h2>
        <p>Local folder this copilot writes into. Not crawled; not uploaded.</p>
      </header>
      <form className="vaultForm" onSubmit={handleSubmit}>
        <label htmlFor="vault-path">Vault path</label>
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
      <dl className="vaultStats">
        <div>
          <dt>Notes</dt>
          <dd>{vault.notes}</dd>
        </div>
        <div>
          <dt>Last scout</dt>
          <dd>{vault.lastScout}</dd>
        </div>
        <div>
          <dt>Last match</dt>
          <dd>{vault.lastMatch}</dd>
        </div>
        <div>
          <dt>Last write</dt>
          <dd>{vault.lastWrite}</dd>
        </div>
      </dl>
    </article>
  );
}
