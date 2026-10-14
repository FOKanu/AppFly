/**
 * Purpose: Turn any ApiError into a failure kind plus one display sentence (UI spec section 1).
 * Does not: show raw `HTTP {status} for /path` text, or any 5xx response body (except 502 upstream errors).
 */
import { ApiError, apiBaseUrl } from "./client";

export type FailureKind =
  | "offline"
  | "timeout"
  | "forbidden-header"
  | "forbidden-origin"
  | "bad-host"
  | "not-found"
  | "rejected"
  | "server";

export interface ApiFailure {
  kind: FailureKind;
  /** HTTP status, or 0 for network failures and timeouts. */
  status: number;
  /** The sentence to show in a toast, banner, or inline line. */
  message: string;
  /** True when a caller-passed signal aborted the request; callers show nothing. */
  aborted: boolean;
}

const LOCAL_UI_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

function pageOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** Purpose: True for the two kinds that mean "the API is not reachable". */
export function isUnreachable(kind: FailureKind): boolean {
  return kind === "offline" || kind === "timeout";
}

/**
 * Purpose: Classify an error from apiFetch and build its display message.
 * Inputs: `action` is the verb phrase for the templates (e.g. "Import"); `notFound` is the
 *         call site's own 404 sentence (used as-is when given).
 * Does not: include response bodies for 5xx (except 502 upstream details), or unredacted detail text.
 */
export function describeApiError(error: unknown, action: string, notFound?: string): ApiFailure {
  const apiError = error instanceof ApiError ? error : null;
  const status = apiError?.status ?? 0;
  const detail = apiError?.detail ?? "";
  const aborted = apiError?.aborted ?? false;
  const origin = pageOrigin();
  const make = (kind: FailureKind, message: string): ApiFailure => ({ kind, status, message, aborted });

  if (apiError?.timeout) {
    const seconds = String((apiError.timeoutMs || 2500) / 1000);
    return make(
      "timeout",
      `The local API didn't answer within ${seconds}s. It may still be working; refresh in a moment before trying again.`,
    );
  }
  if (status === 0) {
    let message = `Can't reach the local API at ${apiBaseUrl()}. Start it with: python -m jobhunt.api.`;
    if (!LOCAL_UI_ORIGINS.includes(origin)) {
      message += ` If the API is already running, this page's address (${origin}) may not be on its allow-list: open AppFly at http://localhost:5173, or add the address to APPFLY_ALLOWED_ORIGINS and restart the API.`;
    }
    return make("offline", message);
  }
  if (status === 403 && detail.includes("X-AppFly")) {
    return make(
      "forbidden-header",
      `${action} was blocked: AppFly sent the request without its security header. This is a bug; please report it.`,
    );
  }
  if (status === 403) {
    return make(
      "forbidden-origin",
      `${action} was blocked: this page's address (${origin}) isn't on the API's allow-list. Open AppFly at http://localhost:5173, or add the address to APPFLY_ALLOWED_ORIGINS and restart the API.`,
    );
  }
  if (status === 400 && /host/i.test(detail)) {
    return make(
      "bad-host",
      "The API only answers on localhost or 127.0.0.1. Set VITE_API_BASE_URL to http://127.0.0.1:8787 and reload.",
    );
  }
  if (status === 404) {
    return make("not-found", notFound ?? `${action} failed: ${detail || `HTTP ${status}`}`);
  }
  if (status === 502 && detail) {
    return make("server", `${action} failed: ${detail}`);
  }
  if (status >= 500) {
    return make(
      "server",
      `${action} failed: the API hit an internal error (HTTP ${status}). Check the terminal running the API, then try again.`,
    );
  }
  return make("rejected", `${action} failed: ${detail || `HTTP ${status}`}`);
}
