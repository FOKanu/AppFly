import { ConnectorKeyField } from "./ConnectorKeyField";
import type { SecretName, SecretsView } from "./types";

export type ApiKeysPanelProps = {
  secrets: SecretsView;
  saving: boolean;
  onSave: (name: SecretName, value: string) => Promise<void>;
};

/**
 * GEMINI_API_KEY and APIFY_TOKEN entry. Status is configured/missing only.
 * Caption: keys never leave this machine in Phase 1.
 */
export function ApiKeysPanel({ secrets, saving, onSave }: ApiKeysPanelProps) {
  return (
    <article className="settingsPanel settingsPanel--keys">
      <header className="settingsPanelHeader">
        <h2>API keys</h2>
        <p>Write-only. Rotate overwrites. The current value is never shown.</p>
      </header>
      <ConnectorKeyField
        name="GEMINI_API_KEY"
        configured={secrets.GEMINI_API_KEY}
        disabled={saving}
        onSave={(value) => onSave("GEMINI_API_KEY", value)}
      />
      <ConnectorKeyField
        name="APIFY_TOKEN"
        configured={secrets.APIFY_TOKEN}
        disabled={saving}
        onSave={(value) => onSave("APIFY_TOKEN", value)}
      />
      <p className="settingsCaption">Keys never leave this machine in Phase 1.</p>
    </article>
  );
}
