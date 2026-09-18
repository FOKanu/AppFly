import { formatStatus } from "./settingsApi";
import type { SettingsView, StatusView } from "./types";

export type ApiHealthPanelProps = {
  health: SettingsView["health"];
};

const ROWS: { key: keyof SettingsView["health"]; label: string }[] = [
  { key: "geminiFlash", label: "Gemini Flash" },
  { key: "ollama", label: "Ollama" },
  { key: "arbeitsagentur", label: "Arbeitsagentur" },
  { key: "apify", label: "Apify" },
  { key: "minilm", label: "MiniLM" },
];

function pillClass(status: StatusView["status"]): string {
  if (status === "ok" || status === "online") return "statusPill statusPill--ok";
  if (status === "offline" || status === "error") return "statusPill statusPill--offline";
  if (status === "missing" || status === "not_configured") return "statusPill statusPill--missing";
  return "statusPill";
}

/**
 * Connector and model health. Status only — no keys, no last-4, no payloads.
 */
export function ApiHealthPanel({ health }: ApiHealthPanelProps) {
  return (
    <article className="settingsPanel">
      <header className="settingsPanelHeader">
        <h2>API &amp; model health</h2>
        <p>Reachability from this machine. Keys are entered in the panel next door.</p>
      </header>
      <ul className="healthList">
        {ROWS.map((row) => {
          const view = health[row.key];
          return (
            <li key={row.key} className="healthRow">
              <span>{row.label}</span>
              <span className={pillClass(view.status)} role="status">
                {formatStatus(view.status)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
