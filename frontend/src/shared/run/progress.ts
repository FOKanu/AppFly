/**
 * Purpose: Which run counts are known, so an unknown count renders as a dash and never as 0 (post-B1 pass, section 1).
 * Does not: format numbers, read the network, or decide the UI state.
 */

/** Fields knownCounts reads; a `GET /runs/{id}` status fits as is. */
export interface KnownCountsInput {
  status: string;
  stage?: string | null;
  interrupted?: boolean;
  scouted?: number;
  shortlisted?: number;
  written?: number;
}

/** True when the count is known. `skipped` follows `shortlisted`; `write_skipped` follows `written`. */
export interface KnownCounts {
  scouted: boolean;
  shortlisted: boolean;
  written: boolean;
}

/**
 * Purpose: Section 1 table. Queued, running before match (stage null or scout) and unknown statuses know nothing;
 *          stage match knows scouted; stage write and the normal end states know all three. Failed (crash) and
 *          interrupted runs use the trailing-zero rule: a count is known if it, or a later count, is above 0.
 * Does not: treat a missing stage as live (that was the queued-zeros regression).
 */
export function knownCounts(input: KnownCountsInput): KnownCounts {
  if (input.interrupted === true || input.status === "failed") {
    const written = (input.written ?? 0) > 0;
    const shortlisted = written || (input.shortlisted ?? 0) > 0;
    const scouted = shortlisted || (input.scouted ?? 0) > 0;
    return { scouted, shortlisted, written };
  }
  switch (input.status) {
    case "completed":
    case "completed_with_errors":
    case "cancelled":
      return { scouted: true, shortlisted: true, written: true };
    case "running":
      if (input.stage === "match") return { scouted: true, shortlisted: false, written: false };
      if (input.stage === "write") return { scouted: true, shortlisted: true, written: true };
      return { scouted: false, shortlisted: false, written: false };
    default:
      return { scouted: false, shortlisted: false, written: false };
  }
}
