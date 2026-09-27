/**
 * Purpose: M8 — fail if the Vite production bundle contains secret-shaped tokens.
 * Inputs: Path to frontend/dist (default) or argv[2].
 * Returns: Exit 0 when clean; exit 1 listing matches.
 * Does not: Scan source maps or node_modules.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const distRoot = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, "dist");

/** Patterns that must never appear in a shipped renderer bundle. */
const FORBIDDEN = [
  { name: "google-api-key", re: /\bAIza[0-9A-Za-z\-_]{20,}\b/g },
  { name: "openai-sk", re: /\bsk-[A-Za-z0-9]{16,}\b/g },
  { name: "key-assignment", re: /\b(GEMINI_API_KEY|APIFY_TOKEN|JOBSUCHE_API_KEY)\s*=\s*(?!\[redacted\])\S+/gi },
];

/** Allowed literal mentions (guard messages / field labels), not values. */
const ALLOWED_SUBSTRINGS = ["VITE_GEMINI_API_KEY is forbidden", "VITE_GEMINI_API_KEY"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...walk(path));
    else if (/\.(js|css|html|map)$/.test(name)) out.push(path);
  }
  return out;
}

function scrubAllowed(text) {
  let next = text;
  for (const allowed of ALLOWED_SUBSTRINGS) {
    next = next.split(allowed).join("");
  }
  return next;
}

const files = walk(distRoot);
const hits = [];

for (const file of files) {
  const raw = scrubAllowed(readFileSync(file, "utf8"));
  for (const rule of FORBIDDEN) {
    rule.re.lastIndex = 0;
    const match = raw.match(rule.re);
    if (match) {
      hits.push({ file: relative(root, file), rule: rule.name, samples: [...new Set(match)].slice(0, 3) });
    }
  }
}

if (hits.length) {
  console.error("M8 bundle secret scan FAILED:");
  for (const hit of hits) {
    console.error(`  ${hit.file} [${hit.rule}]: ${hit.samples.join(", ")}`);
  }
  process.exit(1);
}

console.log(`M8 bundle secret scan OK (${files.length} files under ${relative(root, distRoot) || "dist"})`);
