/**
 * Purpose: Start Neutralino, spawn the loopback FastAPI if needed, exit cleanly.
 * Inputs: NL_* globals from Neutralino; the launch plan (which python to try,
 *   in order) comes from AppFlyLaunchPlan (resources/js/launch-plan.js).
 * Returns: None (side effects only).
 * Does not: Put API keys in the renderer, fetch job-board URLs, or bind the API
 *   off loopback.
 */

/* global Neutralino, NL_PATH, NL_PORT, NL_OS, NL_PID, AppFlyLaunchPlan */

/** @type {number | null} */
let apiSpawnId = null;
/** True only when this shell started the API (so we may stop it on quit). */
let apiOwnedByShell = false;

const API_HEALTH = "http://127.0.0.1:8787/health";
const API_POLL_MS = 250;

/** Resolvers waiting for a spawned process to exit, keyed by spawn id. */
const exitWaiters = new Map();
/** Exit events that arrived before anyone waited (fast-failing commands). */
const earlyExits = new Set();

/**
 * @param {{ detail?: { id?: number, action?: string } }} e
 */
function onSpawnedProcess(e) {
  const d = e && e.detail;
  if (!d || d.action !== "exit") {
    return;
  }
  const resolve = exitWaiters.get(d.id);
  if (resolve) {
    exitWaiters.delete(d.id);
    resolve("exited");
  } else {
    earlyExits.add(d.id);
  }
}

/**
 * @param {number} id
 * @returns {Promise<"exited">} resolves at once if the exit already arrived.
 */
function exitOf(id) {
  if (earlyExits.has(id)) {
    earlyExits.delete(id);
    return Promise.resolve("exited");
  }
  return new Promise((resolve) => exitWaiters.set(id, resolve));
}

/**
 * @param {string} path
 * @returns {Promise<boolean>} false when getStats throws (missing path).
 */
async function exists(path) {
  try {
    await Neutralino.filesystem.getStats(path);
    return true;
  } catch {
    return false;
  }
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
 * Try each launch candidate in order; stop at the first healthy API.
 * A timeout stops the search (right python present but broken/slow).
 * @returns {Promise<void>}
 */
async function ensureApi() {
  if (await apiHealthy()) {
    console.log("[appfly-desktop] API already up on :8787");
    return;
  }

  const plan = AppFlyLaunchPlan;
  const roots = plan.resolveRoots({ nlPath: NL_PATH });
  const cands = plan.buildCandidates({
    nlPath: NL_PATH,
    os: NL_OS,
    nlPort: NL_PORT,
    parentPid: typeof NL_PID === "number" ? NL_PID : undefined,
  });
  /** @type {{ id: string, label: string, waitMs: number, outcome: string }[]} */
  const attempts = [];

  for (const c of cands) {
    const rec = (outcome) =>
      attempts.push({ id: c.id, label: c.label, waitMs: c.waitMs, outcome });
    if (c.requires && !(await exists(c.requires))) {
      rec("missing");
      continue;
    }
    let spawned;
    try {
      console.log("[appfly-desktop] spawning API via", c.label);
      spawned = await Neutralino.os.spawnProcess(c.command, {
        cwd: c.cwd,
        envs: c.envs,
      });
    } catch (err) {
      console.warn("[appfly-desktop] spawn failed", c.id, err);
      rec("spawn-error");
      continue;
    }
    const result = await Promise.race([
      waitForApi(c.waitMs).then((ok) => (ok ? "healthy" : "timeout")),
      exitOf(spawned.id),
    ]);
    exitWaiters.delete(spawned.id);
    if (result === "healthy") {
      apiSpawnId = spawned.id;
      apiOwnedByShell = true;
      console.log("[appfly-desktop] API ready via", c.label);
      return;
    }
    if (result === "exited") {
      rec("exited");
      continue;
    }
    try {
      await Neutralino.os.updateSpawnedProcess(spawned.id, "exit");
    } catch (err) {
      console.warn("[appfly-desktop] failed to stop slow API process", err);
    }
    rec("timeout");
    break;
  }

  const m = plan.failureMessage(attempts, {
    packaged: roots.repoRoot === null,
    os: NL_OS,
  });
  console.error("[appfly-desktop]", m.title, "-", m.content, attempts);
  try {
    await Neutralino.os.showMessageBox(m.title, m.content, "OK", "ERROR");
  } catch (err) {
    console.warn("[appfly-desktop] failed to show error dialog", err);
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
  Neutralino.events.on("spawnedProcess", onSpawnedProcess);
  try {
    await ensureApi();
  } catch (err) {
    console.error("[appfly-desktop] ensureApi failed", err);
  }
}

main();
