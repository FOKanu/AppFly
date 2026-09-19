/**
 * Purpose: Normalise a job score onto the 0–10 scale the UI prints.
 * Inputs: A score that may already be 0–10, or a 0–1 cosine from the matcher.
 * Returns: 0–10, or null when the job has not been scored.
 * Does not: re-run the matcher or change the shortlist threshold.
 */
export function toTenPointScale(score: number | undefined | null): number | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
