import { apiBaseUrl } from "../../shared/api/client";
import type { JobCounts, JobStatus, MemoryView, RequirementsOverview } from "./types";
import { JOB_STATUSES } from "./types";

/**
 * Purpose: Load vault/profile overview from GET /settings and GET /jobs.
 * Does not: render CV body, request connector keys, or write settings.
 */
export async function loadMemory(): Promise<MemoryView> {
  try {
    const [settings, jobs] = await Promise.all([getJson("/settings"), getJson("/jobs")]);
    return normalizeMemory(settings, jobs, "api");
  } catch {
    return { ...MOCK_MEMORY, source: "mock" };
  }
}

/**
 * Purpose: Map mixed API payloads into a display model with paths and counts.
 * Does not: keep CV or voice-sample bodies on the returned object.
 */
export function normalizeMemory(
  settings: unknown,
  jobs: unknown,
  source: "api" | "mock",
): MemoryView {
  const root = asRecord(settings);
  const vaultPath = asString(root.vault_path ?? root.vaultPath, "~/Documents/Job Search");
  const health = asRecord(root.health);
  const cvDiscarded = takeTextStats(root.cv ?? root.cv_text ?? root.cvText);
  const voiceDiscarded = takeTextStats(
    root.voice_samples ?? root.voiceSamples ?? root.voice_sample_text,
  );
  const reqRecord = asRecord(root.requirements);

  return {
    vaultPath,
    jobCounts: countJobsByStatus(jobs),
    cv: {
      path: asString(asRecord(root.cv).path, joinVaultPath(vaultPath, "CV/Master.md")),
      exists: asBool(asRecord(root.cv).exists, asBool(health.cv_present, cvDiscarded.charCount > 0)),
      charCount: asOptionalNumber(asRecord(root.cv).char_count ?? asRecord(root.cv).charCount) ??
        (cvDiscarded.charCount || undefined),
      wordCount: asOptionalNumber(asRecord(root.cv).word_count ?? asRecord(root.cv).wordCount) ??
        (cvDiscarded.wordCount || undefined),
      sectionCount: asOptionalNumber(
        asRecord(root.cv).section_count ?? asRecord(root.cv).sectionCount,
      ),
    },
    voiceSamples: {
      path: asString(
        asRecord(root.voice_samples ?? root.voiceSamples).path,
        joinVaultPath(vaultPath, "CV/Voice-samples.md"),
      ),
      exists: asBool(
        asRecord(root.voice_samples ?? root.voiceSamples).exists,
        voiceDiscarded.sampleCount > 0 || voiceDiscarded.charCount > 0,
      ),
      charCount:
        asOptionalNumber(
          asRecord(root.voice_samples ?? root.voiceSamples).char_count ??
            asRecord(root.voice_samples ?? root.voiceSamples).charCount,
        ) ?? (voiceDiscarded.charCount || undefined),
      sampleCount:
        asOptionalNumber(
          asRecord(root.voice_samples ?? root.voiceSamples).sample_count ??
            asRecord(root.voice_samples ?? root.voiceSamples).sampleCount,
        ) ?? (voiceDiscarded.sampleCount || undefined),
    },
    requirements: normalizeRequirements(reqRecord, vaultPath, health),
    search: {
      keywords: asStringList(root.keywords),
      location: asString(root.location, "—"),
      radiusKm: asNumber(root.radius_km ?? root.radiusKm, 0),
      publishedDays: asNumber(root.published_days ?? root.publishedDays, 0),
      sources: {
        agentur: asBool(asRecord(root.sources).agentur, true),
        inbox: asBool(asRecord(root.sources).inbox, true),
        rssCount: asStringList(asRecord(root.sources).rss).length,
        apifyEnabled: asBool(asRecord(asRecord(root.sources).apify).enabled, false),
      },
    },
    source,
  };
}

/**
 * Purpose: Sample overview used when the local API is unreachable.
 * Does not: include CV body or API keys.
 */
export const MOCK_MEMORY: MemoryView = {
  vaultPath: "~/Documents/Job Search",
  jobCounts: {
    inbox: 11,
    shortlist: 6,
    draft: 4,
    approved: 2,
    applied: 3,
    skipped: 8,
  },
  cv: {
    path: "~/Documents/Job Search/CV/Master.md",
    exists: true,
    wordCount: 412,
    charCount: 2680,
    sectionCount: 4,
  },
  voiceSamples: {
    path: "~/Documents/Job Search/CV/Voice-samples.md",
    exists: true,
    sampleCount: 2,
    charCount: 1840,
  },
  requirements: {
    path: "~/Documents/Job Search/Requirements.md",
    exists: true,
    locations: ["Berlin", "Remote"],
    languages: ["de", "en"],
    salaryFloor: 0,
    bannedTermCount: 3,
    skipCompanyCount: 0,
    mustHave: [],
    niceToHave: ["Python", "TypeScript"],
    tone: "concise, specific, no buzzword salad",
  },
  search: {
    keywords: ["Software Engineer", "Python"],
    location: "Berlin",
    radiusKm: 50,
    publishedDays: 7,
    sources: {
      agentur: true,
      inbox: true,
      rssCount: 0,
      apifyEnabled: false,
    },
  },
  source: "mock",
};

/**
 * Purpose: Count GET /jobs summaries by status for VaultStats.
 * Does not: keep titles, URLs, or letter excerpts.
 */
export function countJobsByStatus(payload: unknown): JobCounts {
  const counts = emptyJobCounts();
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const nested = asRecord(payload).counts ?? asRecord(payload).by_status;
    if (nested && typeof nested === "object") {
      for (const status of JOB_STATUSES) {
        const value = asRecord(nested)[status];
        if (typeof value === "number" && Number.isFinite(value)) counts[status] = value;
      }
      return counts;
    }
  }
  const jobs = unwrapList(payload, ["jobs", "items", "results"]);
  for (const item of jobs) {
    const status = asString(asRecord(item).status);
    if ((JOB_STATUSES as string[]).includes(status)) {
      counts[status as JobStatus] += 1;
    }
  }
  return counts;
}

function normalizeRequirements(
  req: Record<string, unknown>,
  vaultPath: string,
  health: Record<string, unknown>,
): RequirementsOverview {
  const banned = asStringList(req.banned_terms ?? req.bannedTerms);
  const skip = asStringList(req.skip_companies ?? req.skipCompanies);
  return {
    path: asString(req.path, joinVaultPath(vaultPath, "Requirements.md")),
    exists: asBool(req.exists, asBool(health.requirements_present, Object.keys(req).length > 0)),
    locations: asStringList(req.locations),
    languages: asStringList(req.languages),
    salaryFloor: asNumber(req.salary_floor ?? req.salaryFloor, 0),
    bannedTermCount: asOptionalNumber(req.banned_term_count) ?? banned.length,
    skipCompanyCount: asOptionalNumber(req.skip_company_count) ?? skip.length,
    mustHave: asStringList(req.must_have ?? req.mustHave),
    niceToHave: asStringList(req.nice_to_have ?? req.niceToHave),
    tone: asString(req.tone, ""),
  };
}

/**
 * Purpose: Measure accidental CV/voice bodies then drop the text.
 * Does not: return the original string.
 */
function takeTextStats(value: unknown): { charCount: number; wordCount: number; sampleCount: number } {
  let text = "";
  if (typeof value === "string") text = value;
  else if (value && typeof value === "object") {
    const record = asRecord(value);
    const body = record.content ?? record.text ?? record.body ?? record.markdown;
    if (typeof body === "string") text = body;
  }
  if (!text) return { charCount: 0, wordCount: 0, sampleCount: 0 };
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sampleCount = (text.match(/^##\s+Sample\b/gim) ?? []).length;
  return { charCount: text.length, wordCount, sampleCount };
}

function emptyJobCounts(): JobCounts {
  return { inbox: 0, shortlist: 0, draft: 0, approved: 0, applied: 0, skipped: 0 };
}

function joinVaultPath(vaultPath: string, relative: string): string {
  const root = vaultPath.replace(/\/+$/, "");
  return root ? `${root}/${relative}` : relative;
}

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`GET ${path} failed (${response.status})`);
  return response.json();
}

function unwrapList(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  }
  return [];
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}
