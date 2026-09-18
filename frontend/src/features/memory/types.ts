/**
 * Purpose: Funnel stage used by GET /jobs counts.
 * Does not: encode packet or letter bodies.
 */
export type JobStatus =
  | "inbox"
  | "shortlist"
  | "draft"
  | "approved"
  | "applied"
  | "skipped";

/**
 * Purpose: Counts of vault job notes grouped by status.
 * Does not: store job URLs or descriptions.
 */
export type JobCounts = Record<JobStatus, number>;

/**
 * Purpose: Stats for a vault note. Never includes file body.
 * Does not: carry markdown content into React.
 */
export type VaultFileStats = {
  path: string;
  exists: boolean;
  charCount?: number;
  wordCount?: number;
  sampleCount?: number;
  sectionCount?: number;
};

/**
 * Purpose: Read-only requirements snapshot (filter lists, not markdown).
 * Does not: include the Requirements.md body.
 */
export type RequirementsOverview = {
  path: string;
  exists: boolean;
  locations: string[];
  languages: string[];
  salaryFloor: number;
  bannedTermCount: number;
  skipCompanyCount: number;
  mustHave: string[];
  niceToHave: string[];
  tone: string;
};

/**
 * Purpose: Search preset fields from GET /settings.
 * Does not: include API keys or last-4 suffixes.
 */
export type SearchPreset = {
  keywords: string[];
  location: string;
  radiusKm: number;
  publishedDays: number;
  sources: {
    agentur: boolean;
    inbox: boolean;
    rssCount: number;
    apifyEnabled: boolean;
  };
};

/**
 * Purpose: Page model for Memory — paths and counts only.
 * Does not: include CV text or secrets.
 */
export type MemoryView = {
  vaultPath: string;
  jobCounts: JobCounts;
  cv: VaultFileStats;
  voiceSamples: VaultFileStats;
  requirements: RequirementsOverview;
  search: SearchPreset;
  source: "api" | "mock";
};

/**
 * Purpose: Status keys shown on VaultStats, in funnel order.
 * Does not: define matcher scoring.
 */
export const JOB_STATUSES: JobStatus[] = [
  "inbox",
  "shortlist",
  "draft",
  "approved",
  "applied",
  "skipped",
];
