import { getJob, listJobs } from "../queue/jobsApi";
import type { JobRecord } from "../queue/types";

/**
 * Purpose: Build the career ledger from the jobs the vault already holds.
 * Does not: fetch jobs itself — it reuses the Queue's client so both screens
 *           share one normaliser and one mock-fallback policy.
 *           It also invents no dates: neither JobSummary nor JobPacket carries
 *           a timestamp, so every "when" reads "—" until the backend records one.
 */

/** Statuses that mean a job reached the human-decision end of the pipeline. */
export const LEDGER_STATUSES = ["approved", "applied"] as const;

/** How many packets we will hydrate for salary before giving up. */
const HYDRATE_CAP = 24;

/** One application the copilot helped you send or approve. */
export interface LedgerEntry {
  sourceId: string;
  company: string;
  role: string;
  location: string;
  status: string;
  source: string;
  /** 0–10, or null when unscored. */
  score: number | null;
  /** As printed on the posting, or "" when the vault did not capture it. */
  salary: string;
  hasLetter: boolean;
  url: string;
}

/** Company-level rollup for the "already hit" view. */
export interface CompanyEntry {
  company: string;
  roles: string[];
  applied: number;
  approved: number;
  /** Best score seen across this company's jobs. */
  bestScore: number | null;
  salaries: string[];
}

export interface LedgerSnapshot {
  entries: LedgerEntry[];
  companies: CompanyEntry[];
  /** Counts across every job in the vault, not just ledger statuses. */
  totals: Record<string, number>;
  /** True when salary could not be hydrated for every row. */
  salaryTruncated: boolean;
  /** True when the local API was unreachable and mocks were used. */
  usingMock: boolean;
}

/**
 * Purpose: Load every job, then hydrate the approved/applied ones for salary.
 * Returns: The ledger plus vault-wide status totals.
 * Does not: fetch listing URLs — only this API's own endpoints.
 */
export async function loadLedger(): Promise<LedgerSnapshot> {
  const { jobs, usingMock } = await listJobs();
  const totals = countByStatus(jobs);

  const ledgerJobs = jobs.filter((job) =>
    (LEDGER_STATUSES as readonly string[]).includes(job.status),
  );

  // GET /jobs omits salary, so fill it in from the packet for a bounded slice.
  const needsSalary = ledgerJobs.filter((job) => !job.salary).slice(0, HYDRATE_CAP);
  const hydrated = await Promise.all(
    needsSalary.map(async (job) => {
      try {
        const result = await getJob(job.source_id);
        return [job.source_id, result.job.salary] as const;
      } catch {
        return [job.source_id, ""] as const;
      }
    }),
  );
  const salaryById = new Map(hydrated.filter(([, salary]) => salary));

  const entries: LedgerEntry[] = ledgerJobs.map((job) => ({
    sourceId: job.source_id,
    company: job.company || "—",
    role: job.title || "—",
    location: job.location,
    status: job.status,
    source: job.source,
    score: toTenPointScale(job.score),
    salary: job.salary || salaryById.get(job.source_id) || "",
    hasLetter: Boolean(job.letter_excerpt),
    url: job.url,
  }));

  return {
    entries,
    companies: rollUpByCompany(entries),
    totals,
    salaryTruncated: ledgerJobs.filter((job) => !job.salary).length > needsSalary.length,
    usingMock,
  };
}

/** Purpose: Count every job by status, for the summary strip. */
export function countByStatus(jobs: Pick<JobRecord, "status">[]): Record<string, number> {
  return jobs.reduce<Record<string, number>>((counts, job) => {
    counts[job.status] = (counts[job.status] ?? 0) + 1;
    return counts;
  }, {});
}

/**
 * Purpose: Collapse entries into one row per company, so you can see at a
 *          glance who you have already approached.
 */
export function rollUpByCompany(entries: LedgerEntry[]): CompanyEntry[] {
  const byCompany = new Map<string, CompanyEntry>();

  for (const entry of entries) {
    const existing = byCompany.get(entry.company);
    const row: CompanyEntry = existing ?? {
      company: entry.company,
      roles: [],
      applied: 0,
      approved: 0,
      bestScore: null,
      salaries: [],
    };
    if (!row.roles.includes(entry.role)) row.roles.push(entry.role);
    if (entry.status === "applied") row.applied += 1;
    if (entry.status === "approved") row.approved += 1;
    if (entry.score !== null && (row.bestScore === null || entry.score > row.bestScore)) {
      row.bestScore = entry.score;
    }
    if (entry.salary && !row.salaries.includes(entry.salary)) row.salaries.push(entry.salary);
    byCompany.set(entry.company, row);
  }

  return [...byCompany.values()].sort((a, b) => {
    const byVolume = b.applied + b.approved - (a.applied + a.approved);
    return byVolume !== 0 ? byVolume : a.company.localeCompare(b.company);
  });
}

/** Matcher scores arrive as a 0–1 cosine; the ledger prints 0–10. */
export function toTenPointScale(score: number | null | undefined): number | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
