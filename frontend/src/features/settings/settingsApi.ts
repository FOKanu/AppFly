import { apiBaseUrl as coreApiBaseUrl } from "../../shared/api/client";
import type {
  SecretName,
  SettingsView,
  StatusKind,
  StatusView,
  VaultView,
} from "./types";

const SECRET_NAMES: readonly SecretName[] = ["GEMINI_API_KEY", "APIFY_TOKEN"];

const SECRET_PATH: Record<SecretName, string> = {
  GEMINI_API_KEY: "gemini",
  APIFY_TOKEN: "apify",
};

const FORBIDDEN_VITE_SECRET = "VITE_GEMINI_API_KEY";

/**
 * Origin for the local Jobhunt API. The only Vite env this feature reads
 * is `VITE_API_BASE_URL`. Connector keys must never be bundled via VITE_*.
 */
export function apiBaseUrl(): string {
  const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;
  if (env[FORBIDDEN_VITE_SECRET]) {
    throw new Error(
      "VITE_GEMINI_API_KEY is forbidden. Enter keys in Settings; they never ship in the frontend bundle.",
    );
  }
  return coreApiBaseUrl();
}

function joinApi(path: string): string {
  const base = apiBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function placeholder(value: unknown): string {
  if (value == null || value === "") return "—";
  return String(value);
}

function asStatus(raw: unknown, fallback: StatusKind): StatusView {
  if (typeof raw === "string") {
    return { status: coerceStatus(raw, fallback) };
  }
  if (isRecord(raw)) {
    const status = coerceStatus(
      typeof raw.status === "string" ? raw.status : fallback,
      fallback,
    );
    const detail =
      typeof raw.detail === "string"
        ? raw.detail
        : typeof raw.message === "string"
          ? raw.message
          : undefined;
    return detail ? { status, detail } : { status };
  }
  return { status: fallback };
}

function coerceStatus(raw: string, fallback: StatusKind): StatusKind {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const allowed: StatusKind[] = [
    "online",
    "offline",
    "ok",
    "missing",
    "error",
    "unknown",
    "not_configured",
  ];
  if (normalized === "notconfigured") return "not_configured";
  if (normalized === "healthy" || normalized === "ready") return "ok";
  if (normalized === "down" || normalized === "unreachable") return "offline";
  return (allowed as string[]).includes(normalized)
    ? (normalized as StatusKind)
    : fallback;
}

function pick(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

/**
 * Read a configured flag only. If the API bugs out and returns a key string,
 * the characters are discarded and never copied onto the view-model.
 */
export function configuredFlag(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    return raw.trim().length > 0;
  }
  if (isRecord(raw)) {
    if (typeof raw.configured === "boolean") return raw.configured;
    if (typeof raw.present === "boolean") return raw.present;
    if (typeof raw.set === "boolean") return raw.set;
    return false;
  }
  return false;
}

function emptySettings(ipc: StatusView): SettingsView {
  return {
    vault: {
      path: "",
      notes: "—",
      lastScout: "—",
      lastMatch: "—",
      lastWrite: "—",
    },
    connectivity: {
      localIpc: ipc,
      remoteBridge: { status: "not_configured", url: "" },
    },
    health: {
      geminiFlash: { status: "unknown" },
      ollama: { status: "unknown" },
      arbeitsagentur: { status: "unknown" },
      apify: { status: "unknown" },
      minilm: { status: "unknown" },
    },
    secrets: {
      GEMINI_API_KEY: false,
      APIFY_TOKEN: false,
    },
  };
}

function parseVault(raw: unknown): VaultView {
  const record = isRecord(raw) ? raw : {};
  return {
    path:
      typeof record.path === "string"
        ? record.path
        : typeof record.vaultPath === "string"
          ? record.vaultPath
          : typeof record.vault_path === "string"
            ? record.vault_path
            : "",
    notes: placeholder(pick(record, ["notes", "notesCount", "note_count"])),
    lastScout: placeholder(pick(record, ["lastScout", "last_scout", "scout"])),
    lastMatch: placeholder(pick(record, ["lastMatch", "last_match", "match"])),
    lastWrite: placeholder(pick(record, ["lastWrite", "last_write", "write"])),
  };
}

/**
 * Parse GET /settings into a renderable snapshot.
 * Secret-shaped strings are never assigned to the returned object.
 */
export function parseSettings(payload: unknown, ipcReachable: boolean): SettingsView {
  const base = emptySettings(
    ipcReachable
      ? { status: "online", detail: "Local API reachable" }
      : { status: "offline", detail: "Local API unreachable" },
  );
  if (!isRecord(payload)) return base;

  const vaultSource = isRecord(payload.vault) ? payload.vault : payload;
  const vault = parseVault(vaultSource);
  if (!vault.path && typeof payload.vaultPath === "string") {
    vault.path = payload.vaultPath;
  }
  if (!vault.path && typeof payload.vault_path === "string") {
    vault.path = payload.vault_path;
  }

  const connectivityRaw = isRecord(payload.connectivity) ? payload.connectivity : payload;
  const localIpcPayload = pick(connectivityRaw, ["localIpc", "local_ipc", "ipc"]);
  const remoteRaw = pick(connectivityRaw, ["remoteBridge", "remote_bridge", "bridge"]);
  const remoteRecord = isRecord(remoteRaw) ? remoteRaw : {};
  const remoteUrl = typeof remoteRecord.url === "string" ? remoteRecord.url : "";
  const remoteStatus = asStatus(
    remoteRaw,
    remoteUrl ? "offline" : "not_configured",
  );
  if (remoteStatus.status === "online") {
    // Phase 1: do not claim the bridge is up; this UI never starts it.
    remoteStatus.status = remoteUrl ? "offline" : "not_configured";
    remoteStatus.detail = "Remote Bridge is Phase 2";
  }

  const healthRaw = isRecord(payload.health) ? payload.health : payload;
  const secretsRaw = isRecord(payload.secrets) ? payload.secrets : payload;

  const localIpc = localIpcPayload
    ? asStatus(localIpcPayload, ipcReachable ? "online" : "offline")
    : base.connectivity.localIpc;
  if (!ipcReachable) {
    localIpc.status = "offline";
  } else if (localIpc.status === "unknown") {
    localIpc.status = "online";
  }

  const secrets = {
    GEMINI_API_KEY: configuredFlag(pick(secretsRaw, ["GEMINI_API_KEY", "gemini"])),
    APIFY_TOKEN: configuredFlag(pick(secretsRaw, ["APIFY_TOKEN", "apify"])),
  };

  return {
    vault,
    connectivity: {
      localIpc,
      remoteBridge: { ...remoteStatus, url: remoteUrl },
    },
    health: {
      geminiFlash: secrets.GEMINI_API_KEY
        ? { status: "ok", detail: "Key present in store" }
        : { status: "missing", detail: "Not in Keychain" },
      ollama: asStatus(pick(healthRaw, ["ollama"]), "unknown"),
      arbeitsagentur: asStatus(
        pick(healthRaw, ["arbeitsagentur", "agentur", "jobsuche"]),
        "unknown",
      ),
      apify: secrets.APIFY_TOKEN
        ? { status: "ok", detail: "Key present in store" }
        : { status: "missing", detail: "Not in Keychain" },
      minilm: asStatus(pick(healthRaw, ["minilm", "miniLm", "embedding"]), "unknown"),
    },
    secrets,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * GET /settings. Uses boolean configured flags only.
 * If the payload ever includes a key string, parseSettings ignores it.
 */
export async function fetchSettings(): Promise<SettingsView> {
  try {
    const response = await fetch(joinApi("/settings"), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return parseSettings(null, false);
    }
    const payload = await readJson(response);
    return parseSettings(payload, true);
  } catch {
    return parseSettings(null, false);
  }
}

/**
 * PUT /settings/secrets/{name} with `{ value }`. Response bodies are not
 * inspected for key material. Rotate is the same overwrite call.
 */
export async function putConnectorSecret(name: SecretName, value: string): Promise<void> {
  if (!(SECRET_NAMES as readonly string[]).includes(name)) {
    throw new Error("Unknown connector secret");
  }
  const response = await fetch(joinApi(`/settings/secrets/${encodeURIComponent(SECRET_PATH[name])}`), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    throw new Error(`Could not save ${name}`);
  }
}

/**
 * Persist the Obsidian vault path. Not a secret. Backend may ignore until A2.
 */
export async function putVaultPath(path: string): Promise<void> {
  const response = await fetch(joinApi("/settings"), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ vault_path: path }),
  });
  if (!response.ok) {
    throw new Error("Could not save vault path");
  }
}

/** Human label for a status kind (configured/missing live on ConnectorKeyField). */
export function formatStatus(status: StatusKind): string {
  if (status === "not_configured") return "not configured";
  return status.replace(/_/g, " ");
}

/** Connector names the keys panel may PUT. */
export const SECRET_FIELD_NAMES = SECRET_NAMES;
