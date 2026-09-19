/**
 * View-model types for Settings. Secrets never appear as strings here —
 * connectors are booleans (`configured` / missing) only.
 */

/** Connector secret names accepted by PUT /settings/secrets/{name}. */
export type SecretName = "GEMINI_API_KEY" | "APIFY_TOKEN";

/** Display status for health and connectivity rows. */
export type StatusKind =
  | "online"
  | "offline"
  | "ok"
  | "missing"
  | "error"
  | "unknown"
  | "not_configured";

/** One health/connectivity cell. `detail` is never a secret. */
export type StatusView = {
  status: StatusKind;
  detail?: string;
};

/**
 * Vault path plus placeholder stats from GET /settings.
 *
 * The four counters are the tiles the Settings design shows. The API may not
 * send them yet, so they default to an em dash rather than disappearing.
 */
export type VaultView = {
  path: string;
  notes: string;
  lastScout: string;
  lastMatch: string;
  lastWrite: string;
  jobNotes: string;
  companyNotes: string;
  letterDrafts: string;
  runLogs: string;
};

/** Local IPC + Phase-2 Remote Bridge (URL only; Connect is a stub). */
export type ConnectivityView = {
  localIpc: StatusView;
  remoteBridge: StatusView & { url: string };
};

/** Write-only connector flags. Never includes key material. */
export type SecretsView = {
  GEMINI_API_KEY: boolean;
  APIFY_TOKEN: boolean;
};

/** Sanitized GET /settings snapshot safe to render. */
export type SettingsView = {
  vault: VaultView;
  connectivity: ConnectivityView;
  health: {
    geminiFlash: StatusView;
    ollama: StatusView;
    arbeitsagentur: StatusView;
    apify: StatusView;
    minilm: StatusView;
  };
  secrets: SecretsView;
};
