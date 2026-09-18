import { Panel } from "../../shared/ui/Panel";

/**
 * Purpose: Settings route placeholder inside the app shell.
 * Does not: collect, display, or persist connector API keys.
 */
export function SettingsPage() {
  return (
    <section className="page">
      <p className="page__index">06</p>
      <h2 className="page__title">Settings</h2>
      <Panel>
        <p className="page__lead">Connector keys stay in the local vault and <code>.env</code>, not this UI.</p>
        <p className="page__copy">
          Key fields, keychain, and IPC paths land in a later settings slice. The footer
          only shows Gemini / Ollama / IPC health, never secrets.
        </p>
      </Panel>
    </section>
  );
}
