import { useCallback, useEffect, useState } from "react";
import { ApiHealthPanel } from "./ApiHealthPanel";
import { ApiKeysPanel } from "./ApiKeysPanel";
import { ConnectivityPanel } from "./ConnectivityPanel";
import {
  fetchSettings,
  parseSettings,
  putConnectorSecret,
  putVaultPath,
} from "./settingsApi";
import "./settings.css";
import type { SecretName, SettingsView } from "./types";
import { VaultPanel } from "./VaultPanel";

const INITIAL = parseSettings(null, false);

/**
 * Purpose: Settings & connectivity — vault path, Local IPC vs Remote Bridge,
 *          API/model health, and write-only connector keys.
 * Does not: read a key back. GET never returns key material.
 */
export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsView>(INITIAL);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
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

  async function handleSaveVault(path: string) {
    await putVaultPath(path);
    const next = await fetchSettings();
    setSettings(next);
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
          <VaultPanel vault={settings.vault} disabled={loading} onSavePath={handleSaveVault} />
          <ConnectivityPanel connectivity={settings.connectivity} />
        </div>
        <div className="settings__col">
          <ApiHealthPanel health={settings.health} />
          <ApiKeysPanel secrets={settings.secrets} saving={saving} onSave={handleSaveSecret} />
        </div>
      </div>
    </div>
  );
}
