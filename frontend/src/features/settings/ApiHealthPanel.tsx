import { formatStatus } from "./settingsApi";
import type { SettingsView, StatusView } from "./types";

export type ApiHealthPanelProps = {
  health: SettingsView["health"];
};

const ROWS: { key: keyof SettingsView["health"]; label: string; role: string }[] = [
  { key: "geminiFlash", label: "Gemini Flash", role: "writer · cloud letters" },
  { key: "ollama", label: "Ollama (local 8B)", role: "llama3.1:8b · fallback writer" },
  { key: "arbeitsagentur", label: "Arbeitsagentur API", role: "scout · official job search API" },
  { key: "apify", label: "Apify", role: "company / Impressum pages only" },
  { key: "minilm", label: "MiniLM embeddings", role: "match · runs locally, no network" },
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
    <article className="settings-card">
      <p className="settings-card__kicker">Status</p>
      <h2 className="settings-card__title">API &amp; model health</h2>
      <ul className="healthList">
        {ROWS.map((row) => {
          const view = health[row.key];
          return (
            <li key={row.key} className="healthRow" data-status={view.status}>
              <span className="healthRow__dot" aria-hidden="true" />
              <span className="healthRow__col">
                <span className="healthRow__label">{row.label}</span>
                <span className="healthRow__role">{row.role}</span>
              </span>
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
