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
        <p className="page__lead">
          Connector keys are write-only in the OS Keychain. This screen never shows them.
        </p>
        <p className="page__copy">
          Keywords, sources, and secret presence flags land in a later settings slice. The
          footer only shows Gemini configured/missing, never the key.
        </p>
      </Panel>
    </section>
  );
}
