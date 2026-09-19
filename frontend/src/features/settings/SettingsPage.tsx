import { useCallback, useEffect, useState } from "react";
import { ApiHealthPanel } from "./ApiHealthPanel";
import { ApiKeysPanel } from "./ApiKeysPanel";
import { ConnectivityPanel } from "./ConnectivityPanel";
import {
  fetchSettings,
  parseSettings,
  putConnectorSecret,
} from "./settingsApi";
import "./settings.css";
import type { SecretName, SettingsView } from "./types";
import { WorkspacePanel } from "./WorkspacePanel";
import { ImportObsidianPanel } from "./ImportObsidianPanel";
import { Toast, useToast } from "../../shared/ui/Toast";

const INITIAL = parseSettings(null, false);

/**
 * Purpose: Settings & connectivity — where AppFly keeps its own files, Local
 *          IPC vs Remote Bridge, API/model health, write-only connector keys,
 *          and the optional one-time Obsidian import.
 * Does not: read a key back. GET never returns key material.
 */
export function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<SettingsView>(INITIAL);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await fetchSettings();
      setSettings(next);
    } catch {
      setLoadError("Could not load settings. Local IPC looks offline.");
      setSettings(parseSettings(null, false));
    }
  }, []);

  useEffect(() => {
    document.title = "AppFly · Settings";
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleSaveSecret(name: SecretName, value: string) {
    setSaving(true);
    try {
      await putConnectorSecret(name, value);
      const next = await fetchSettings();
      setSettings(next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings">
      {loadError ? (
        <p className="settings__banner" role="alert">
          {loadError}
        </p>
      ) : null}

      <div className="settings__columns">
        <div className="settings__col">
          <WorkspacePanel onToast={toast.show} />
          <ConnectivityPanel connectivity={settings.connectivity} />
          <ImportObsidianPanel
            vaultPath={settings.vault.path}
            onToast={toast.show}
            onSaved={() => void reload()}
          />
        </div>
        <div className="settings__col">
          <ApiHealthPanel health={settings.health} />
          <ApiKeysPanel secrets={settings.secrets} saving={saving} onSave={handleSaveSecret} />
        </div>
      </div>

      <Toast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}
