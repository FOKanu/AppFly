/**
 * Purpose: Shared keys for the first-launch wizard gate.
 * Does not: Store secrets, CV text, or data paths.
 */

/** localStorage flag — user chose "Set up later". Only boolean dismissal. */
export const SETUP_DISMISSED_KEY = "appfly.setup.dismissed";

/** How long the boot gate retries /workspace/status while the API may still be spawning. */
export const SETUP_GATE_RETRY_MS = 5000;
export const SETUP_GATE_POLL_MS = 250;
