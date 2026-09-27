import { useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { importObsidianVault } from "../vault/api";
import { putVaultPath } from "./settingsApi";
import { describeApiError } from "../../shared/api/errors";

interface ImportObsidianPanelProps {
  /** `vault_path` from config.yaml, the folder this panel edits. */
  vaultPath: string;
  onToast: (message: string) => void;
  /** Re-read settings after the path is saved. */
  onSaved: () => void;
}

/**
 * Purpose: The Obsidian vault folder — persist it, and optionally copy it into
 *          AppFly's own storage once.
 * Does not: keep the two in sync. Saving the path only records it; importing is
 *           a separate, one-way copy, and AppFly never writes back to Obsidian.
 *
 * Why the path is still editable: `storage_backend` in config.yaml can be
 * "native" or "markdown". Under "markdown" this folder *is* the live store, so
 * the UI must be able to set it, not just import from it.
 */
export function ImportObsidianPanel({
  vaultPath,
  onToast,
  onSaved,
}: ImportObsidianPanelProps) {
  const [path, setPath] = useState(vaultPath);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  // Adopt the stored path once settings arrive.
  useEffect(() => {
    setPath(vaultPath);
  }, [vaultPath]);

  const dirty = path.trim() !== vaultPath.trim();
  const busy = saving || importing;

  async function onSavePath() {
    if (!path.trim()) return;
    setSaving(true);
    try {
      await putVaultPath(path.trim());
      onToast("Vault path saved to config.yaml.");
      onSaved();
    } catch {
      onToast("Could not save the vault path.");
    } finally {
      setSaving(false);
    }
  }

  async function onImport() {
    const source = path.trim();
    if (!source) return;
    setImporting(true);
    try {
      const report = await importObsidianVault(source);
      setImported(true);
      let message = `Imported ${report.jobs} jobs, ${report.letters} letters and ${report.documents} documents from ${report.source}. This was a one-time copy; later edits in Obsidian won't appear here.`;
      if (report.errors.length > 0) {
        message += ` ${report.errors.length} item(s) were skipped; see the API terminal.`;
      }
      onToast(message);
    } catch (error) {
      onToast(
        describeApiError(
          error,
          "Import",
          `No Obsidian vault found at ${source}. Check the folder and try again.`,
        ).message,
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <article
      id="import-obsidian"
      className="settings-card settings-card--secondary"
    >
      <p className="settings-card__kicker settings-card__kicker--muted">Optional</p>
      <h2 className="settings-card__title">Obsidian vault</h2>

      <p className="settings-card__copy">
        Moving over from Obsidian? Point AppFly at the folder and import it once — it copies
        your CVs, letters and notes into AppFly's own storage. This is a one-time import, not
        a live sync.
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
            disabled={busy || !dirty || !path.trim()}
            title={dirty ? undefined : "The stored path already matches."}
            onClick={() => void onSavePath()}
          >
            {saving ? "Saving…" : "Save path"}
          </Button>
          <Button
            variant="quiet"
            disabled={busy || !path.trim()}
            onClick={() => void onImport()}
          >
            {importing ? "Importing…" : imported ? "Import again" : "Import"}
          </Button>
        </div>
      </label>

      <p className="settings-card__copy settings-card__copy--muted">
        Nothing is deleted from the Obsidian folder and you can keep using Obsidian on it
        independently. If <code>storage_backend</code> is set to <code>markdown</code>, this
        folder is the live store rather than an import source.
      </p>
    </article>
  );
}
