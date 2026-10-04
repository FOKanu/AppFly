/**
 * Purpose: The crawl deny-list hosts shown in the UI (Workflow crawl policy card, Profile guardrails).
 * Does not: enforce anything; backend/src/jobhunt/policy.py refuses these hosts before any request.
 */
// Mirror of backend/src/jobhunt/policy.py DENIED_ROOT_DOMAINS. policy.test.ts pins it.
export const BANNED_HOSTS: readonly string[] = [
  "linkedin.com",
  "indeed.com",
  "stepstone.de",
  "stepstone.com",
  "ziprecruiter.com",
  "xing.com",
  "glassdoor.com",
  "glassdoor.de",
  "wellfound.com",
  "angel.co"
] as const;

/** Display brand per banned host; several hosts share one brand. */
const BRAND_BY_HOST: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "indeed.com": "Indeed",
  "stepstone.de": "Stepstone",
  "stepstone.com": "Stepstone",
  "ziprecruiter.com": "ZipRecruiter",
  "xing.com": "Xing",
  "glassdoor.com": "Glassdoor",
  "glassdoor.de": "Glassdoor",
  "wellfound.com": "Wellfound (AngelList)",
  "angel.co": "Wellfound (AngelList)",
};

/** Brand names for user-facing copy, derived from BANNED_HOSTS (deduplicated, in host order). */
export const BANNED_BRANDS: readonly string[] = [...new Set(BANNED_HOSTS.map((host) => BRAND_BY_HOST[host] ?? host))];
