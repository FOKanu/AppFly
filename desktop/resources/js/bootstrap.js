/**
 * Purpose: Start Neutralino, spawn the loopback FastAPI if needed, exit cleanly.
 * Inputs: NL_* globals from Neutralino; optional APPFLY_PYTHON in the process env
 *   is not readable here — the shell resolves python next to the repo checkout.
 * Returns: None (side effects only).
 * Does not: Put API keys in the renderer, fetch job-board URLs, or bind the API
 *   off loopback.
 */

/* global Neutralino, NL_PATH, NL_PORT, NL_OS */

/** @type {number | null} */
let apiSpawnId = null;
/** True only when this shell started the API (so we may stop it on quit). */
let apiOwnedByShell = false;

const API_HEALTH = "http://127.0.0.1:8787/health";
const API_WAIT_MS = 20000;
const API_POLL_MS = 250;

/**
 * @returns {string} Absolute path to the git repo root (parent of desktop/).
 */
function repoRoot() {
  const base = String(NL_PATH || "").replace(/[/\\]+$/, "");
  if (!base) {
    return "..";
  }
  if (base.endsWith("/desktop") || base.endsWith("\\desktop")) {
    return base.slice(0, -"/desktop".length);
  }
  return `${base}/..`;
}

/**
 * @returns {Promise<boolean>}
 */
async function apiHealthy() {
  try {
    const response = await fetch(API_HEALTH, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function waitForApi(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await apiHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, API_POLL_MS));
  }
  return apiHealthy();
}

/**
 * @returns {{ command: string, envs: Record<string, string>, cwd: string }}
 */
function apiSpawnOptions() {
  const root = repoRoot();
  const origins = [
    `http://localhost:${NL_PORT}`,
    `http://127.0.0.1:${NL_PORT}`,
  ].join(",");
  const envs = { APPFLY_ALLOWED_ORIGINS: origins };

  if (NL_OS === "Windows") {
    // Windows: prefer venv python directly (start-api.sh is Unix).
    const venvPy = `${root}/backend/.venv/Scripts/python.exe`;
    return {
      command: `"${venvPy}" -m jobhunt.api`,
      envs,
      cwd: root,
    };
  }

  const script = `${root}/desktop/scripts/start-api.sh`;
  return {
    command: `/bin/bash "${script}"`,
    envs,
    cwd: root,
  };
}

/**
 * @returns {Promise<void>}
 */
async function ensureApi() {
  if (await apiHealthy()) {
    console.log("[appfly-desktop] API already up on :8787");
    return;
  }

  const { command, envs, cwd } = apiSpawnOptions();
  console.log("[appfly-desktop] spawning API…");
  const spawned = await Neutralino.os.spawnProcess(command, {
    cwd,
    envs,
  });
  apiSpawnId = spawned.id;
  apiOwnedByShell = true;

  const ok = await waitForApi(API_WAIT_MS);
  if (!ok) {
    console.error(
      "[appfly-desktop] API did not become healthy within",
      API_WAIT_MS,
      "ms",
    );
  } else {
    console.log("[appfly-desktop] API ready");
  }
}

/**
 * @returns {Promise<void>}
 */
async function stopOwnedApi() {
  if (!apiOwnedByShell || apiSpawnId == null) {
    return;
  }
  try {
    await Neutralino.os.updateSpawnedProcess(apiSpawnId, "exit");
  } catch (err) {
    console.warn("[appfly-desktop] failed to stop API process", err);
  }
  apiSpawnId = null;
  apiOwnedByShell = false;
}

/**
 * @returns {Promise<void>}
 */
async function onWindowClose() {
  await stopOwnedApi();
  await Neutralino.app.exit();
}

async function main() {
  await Neutralino.init();
  Neutralino.events.on("windowClose", onWindowClose);
  try {
    await ensureApi();
  } catch (err) {
    console.error("[appfly-desktop] ensureApi failed", err);
  }
}

main();
