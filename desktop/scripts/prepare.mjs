/**
 * Purpose: Build the Vite UI into desktop/resources and inject Neutralino scripts.
 * Inputs: Repo checkout with frontend/ dependencies installed.
 * Returns: Exit 0 on success.
 * Does not: Download Neutralino binaries (run `npm run update`) or start the app.
 */

import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = join(__dirname, "..");
const repoRoot = join(desktopRoot, "..");
const frontendRoot = join(repoRoot, "frontend");
const uiDist = join(desktopRoot, ".ui-dist");
const resources = join(desktopRoot, "resources");
const bootstrapPath = join(resources, "js", "bootstrap.js");
const clientLibPath = join(resources, "js", "neutralino.js");

if (!existsSync(bootstrapPath)) {
  console.error("missing", bootstrapPath);
  process.exit(1);
}

rmSync(uiDist, { recursive: true, force: true });
mkdirSync(uiDist, { recursive: true });

console.log("Building frontend into desktop/.ui-dist …");
execSync("npx vite build --base / --outDir ../desktop/.ui-dist --emptyOutDir", {
  cwd: frontendRoot,
  stdio: "inherit",
  env: process.env,
});

mkdirSync(join(resources, "js"), { recursive: true });
mkdirSync(join(resources, "icons"), { recursive: true });

const assetsSrc = join(uiDist, "assets");
const assetsDst = join(resources, "assets");
if (existsSync(assetsDst)) {
  rmSync(assetsDst, { recursive: true, force: true });
}
if (existsSync(assetsSrc)) {
  cpSync(assetsSrc, assetsDst, { recursive: true });
}

for (const name of readdirSync(uiDist)) {
  if (name === "assets" || name === "index.html") {
    continue;
  }
  const src = join(uiDist, name);
  const dst = join(resources, name);
  if (statSync(src).isDirectory()) {
    if (existsSync(dst)) {
      rmSync(dst, { recursive: true, force: true });
    }
    cpSync(src, dst, { recursive: true });
  } else {
    cpSync(src, dst);
  }
}

let html = readFileSync(join(uiDist, "index.html"), "utf8");
const inject = `    <script src="/js/neutralino.js"></script>\n    <script src="/js/launch-plan.js"></script>\n    <script src="/js/bootstrap.js"></script>\n`;
if (!html.includes("/js/launch-plan.js")) {
  if (!html.includes("/js/neutralino.js")) {
    if (!html.includes("</body>")) {
      console.error("built index.html has no </body>");
      process.exit(1);
    }
    html = html.replace("</body>", `${inject}</body>`);
  }
}
writeFileSync(join(resources, "index.html"), html);

if (!existsSync(clientLibPath)) {
  console.warn(
    "neutralino.js missing — run `npm run update` in desktop/ before `neu run`.",
  );
} else {
  console.log("Neutralino client library present.");
}

console.log("Scanning built UI for secret-shaped tokens…");
execSync(`node scripts/scan-bundle-secrets.mjs ${JSON.stringify(uiDist)}`, {
  cwd: join(repoRoot, "frontend"),
  stdio: "inherit",
  env: process.env,
});

console.log("desktop/resources ready.");
