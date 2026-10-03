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
