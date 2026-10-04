/**
 * Purpose: Headless smoke that the API start command shape resolves a Python.
 * Inputs: Repo checkout (backend/.venv or uv).
 * Returns: Exit 0 if `python -m jobhunt.api --help` is not used; instead runs
 *   a short import check via the same preference order as bootstrap.js.
 * Does not: Launch Neutralino or bind :8787 for long.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const backend = join(repoRoot, "backend");
const venvPy = join(backend, ".venv", "bin", "python");

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: opts.cwd ?? repoRoot,
    env: { ...process.env, ...(opts.env ?? {}) },
  });
}

let result;
if (existsSync(venvPy)) {
  result = run(venvPy, ["-c", "import jobhunt.api; print('ok')"]);
} else {
  result = run(
    "uv",
    ["run", "python", "-c", "import jobhunt.api; print('ok')"],
    { cwd: backend },
  );
}

if (result.status !== 0) {
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}
console.log("smoke-api-spawn:", result.stdout.trim());
