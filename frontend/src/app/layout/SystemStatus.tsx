import type { LinkHealth, SystemStatusResponse } from "../../shared/api/client";
import { apiBaseUrl } from "../../shared/api/client";

interface SystemStatusProps {
  status: SystemStatusResponse;
  apiReachable: boolean;
}

/**
 * Purpose: Footer strip for Local IPC, Ollama, Gemini, and vault path.
 * Does not: reveal connector keys or open the vault.
 */
export function SystemStatus({ status, apiReachable }: SystemStatusProps) {
  return (
    <footer className="system-status">
      <StatusDot label="Local IPC" health={status.ipc} />
      <StatusDot label="Ollama" health={status.ollama} />
      <StatusDot label="Gemini" health={status.gemini} />
      <span className="system-status__vault" title={status.vaultPath}>
        <span className="system-status__kicker">Vault</span>
        <span className="system-status__path">{status.vaultPath || "—"}</span>
      </span>
      <span className="system-status__api">
        {apiReachable ? "API live" : "API offline"} · {apiBaseUrl()}
      </span>
    </footer>
  );
}

function StatusDot({ label, health }: { label: string; health: LinkHealth }) {
  return (
    <span className="system-status__item" data-health={health}>
      <span className="system-status__dot" aria-hidden="true" />
      <span>
        {label}
        <span className="system-status__health"> {health}</span>
      </span>
    </span>
  );
}
