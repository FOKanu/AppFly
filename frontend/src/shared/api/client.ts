/**
 * Purpose: Typed fetch wrapper against the local Jobhunt HTTP API.
 * Does not: store, request, or type connector API keys or vault secrets.
 */

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

export type HeartbeatState =
  | "idle"
  | "running"
  | "waiting-for-you"
  | "paused"
  | "stopped";

export type LinkHealth = "ok" | "down" | "unknown";

export interface HeartbeatResponse {
  state: HeartbeatState;
  message?: string;
}

export interface SystemStatusResponse {
  ipc: LinkHealth;
  ollama: LinkHealth;
  gemini: LinkHealth;
  vaultPath: string;
}

export interface HealthResponse {
  ok: boolean;
  status: string;
}

export interface SettingsSnapshot {
  vault_path: string;
  secrets: {
    gemini: boolean;
    apify: boolean;
    jobsuche: boolean;
  };
  health: {
    vault_exists: boolean;
  };
}

export interface JobSummary {
  source_id: string;
  status: string;
}

export interface RunResponse {
  scouted: number;
  shortlisted: number;
  written: number;
  errors: string[];
}

/**
 * Purpose: Typed HTTP/network failure from the local API client.
 * Does not: include secret material from the response body.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Purpose: Resolve the API origin from VITE_API_BASE_URL with a loopback default.
 * Does not: read process env for Gemini, Arbeitsagentur, or Apify keys.
 */
export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, "") : DEFAULT_API_BASE_URL;
}

/**
 * Purpose: JSON GET against the local API.
 * Does not: attach auth headers or parse secret-bearing payloads.
 */
export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, { ...init, method: "GET" });
}

/**
 * Purpose: JSON POST against the local API (pipeline run).
 * Does not: upload cookies, session tokens, or crawl start URLs.
 */
export function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, {
    ...init,
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Purpose: Shared fetch with a short GET timeout and a longer POST timeout.
 * Does not: retry scrape/crawl endpoints or log response bodies.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = (init?.method ?? "GET").toUpperCase() === "POST" ? 60_000 : 2500;
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: init?.signal ?? controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status} for ${path}`, response.status);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : "Network error", 0);
  } finally {
    window.clearTimeout(timer);
  }
}
