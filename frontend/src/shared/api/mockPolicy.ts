/**
 * Purpose: M7 / F2 — sample data only when the API is unreachable.
 * Inputs: apiGet failures classified by describeApiError.
 * Returns: Helpers to choose api data, mock samples, or an honest error.
 * Does not: Fall back to samples on HTTP 4xx/5xx while the API is up.
 */

import { apiGet } from "./client";
import { describeApiError, isUnreachable, type ApiFailure } from "./errors";

export type EndpointResult<T> =
  | { ok: true; data: T }
  | { ok: false; failure: ApiFailure };

/** GET one path; never throws. */
export async function tryApiGet<T>(path: string, action: string): Promise<EndpointResult<T>> {
  try {
    return { ok: true, data: await apiGet<T>(path) };
  } catch (error) {
    return { ok: false, failure: describeApiError(error, action) };
  }
}

export type MockPolicyLoad<T> =
  | { source: "api"; data: T }
  | { source: "mock"; data: T }
  | { source: "error"; failure: ApiFailure };

/**
 * Purpose: Combine several endpoint results under the F2 rule.
 * - Any non-unreachable failure → error (no samples).
 * - Any offline/timeout → mock samples.
 * - All ok → live api data.
 */
export function resolveMockPolicy<T>(
  parts: EndpointResult<unknown>[],
  buildApi: () => T,
  mock: T,
): MockPolicyLoad<T> {
  const failures = parts.filter((part): part is { ok: false; failure: ApiFailure } => !part.ok);
  for (const part of failures) {
    if (part.failure.aborted) continue;
    if (!isUnreachable(part.failure.kind)) {
      return { source: "error", failure: part.failure };
    }
  }
  if (failures.some((part) => isUnreachable(part.failure.kind))) {
    return { source: "mock", data: mock };
  }
  return { source: "api", data: buildApi() };
}
