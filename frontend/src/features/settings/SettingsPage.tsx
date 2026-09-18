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
 * Settings & connectivity (FigJam Desktop 1440 / Mobile Settings).
 * Four panels: vault, IPC/bridge, API health, write-only connector keys.
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
    <section className="settingsPage">
      <header className="settingsHero">
        <p className="settingsKicker">Jobhunt Copilot</p>
        <div className="settingsHeroRow">
          <h1>Settings &amp; connectivity</h1>
          <span
            className={
              settings.connectivity.localIpc.status === "online"
                ? "statusPill statusPill--ok"
                : "statusPill statusPill--offline"
            }
            role="status"
          >
            {loading ? "checking…" : settings.connectivity.localIpc.status}
          </span>
        </div>
        <p className="settingsLede">
          Vault path, local IPC, and write-only connector keys for this Mac.
          Remote Bridge stays a stub in Phase 1.
        </p>
        {loadError ? (
          <p className="settingsError" role="alert">
            {loadError}
          </p>
        ) : null}
      </header>
      <div className="settingsGrid">
        <VaultPanel vault={settings.vault} disabled={loading} onSavePath={handleSaveVault} />
        <ConnectivityPanel connectivity={settings.connectivity} />
        <ApiHealthPanel health={settings.health} />
        <ApiKeysPanel secrets={settings.secrets} saving={saving} onSave={handleSaveSecret} />
      </div>
    </section>
  );
}
