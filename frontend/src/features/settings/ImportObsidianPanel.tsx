import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { importObsidianVault } from "../vault/api";

interface ImportObsidianPanelProps {
  /** Path the old config still points at, offered as the default. */
  suggestedPath: string;
  onToast: (message: string) => void;
}

/**
 * Purpose: Optional one-way import of an existing Obsidian vault into AppFly's
 *          own storage.
 * Does not: keep the two in sync, and is not required to use the app. After an
 *           import the copy in AppFly is the one the copilot reads.
 */
export function ImportObsidianPanel({ suggestedPath, onToast }: ImportObsidianPanelProps) {
  const [path, setPath] = useState(suggestedPath);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onImport() {
    if (!path.trim()) return;
    setBusy(true);
    try {
      await importObsidianVault(path.trim());
      setDone(true);
      onToast("Vault imported into AppFly storage.");
    } catch {
      onToast("Import failed — /workspace/import/obsidian is not serving yet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="settings-card settings-card--secondary">
      <p className="settings-card__kicker settings-card__kicker--muted">Optional</p>
      <h2 className="settings-card__title">Import an Obsidian vault</h2>

      <p className="settings-card__copy">
        Moving over from Obsidian? Point AppFly at the folder once and it copies your CVs,
        letters and notes into its own storage. This is a one-time import, not a live sync —
        afterwards AppFly reads its own copy.
      </p>

      <label className="import-field">
        <span className="profile-label">Obsidian vault folder</span>
        <div className="settingsActions">
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="~/Documents/Obsidian Vault"
            value={path}
            disabled={busy}
            aria-label="Obsidian vault folder"
            onChange={(event) => setPath(event.target.value)}
          />
          <Button
            variant="quiet"
            disabled={busy || !path.trim()}
            onClick={() => void onImport()}
          >
            {busy ? "Importing…" : done ? "Import again" : "Import"}
          </Button>
        </div>
      </label>

      <p className="settings-card__copy settings-card__copy--muted">
        Nothing is deleted from the Obsidian folder, and you can keep using Obsidian on it
        independently. AppFly will not write back to it.
      </p>
    </article>
  );
}
