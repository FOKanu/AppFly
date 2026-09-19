import type { HuntProfile } from "../profiles/types";

/**
 * Purpose: A local record of how the hunt profile changed over time.
 * Does not: talk to the API — the backend has no version endpoint. Entries are
 *           written by this browser only, and the shape matches what a future
 *           `GET /profiles/{id}/versions` would return so the screen can swap
 *           its source without changing.
 */

/** Why an entry was written. */
export type VersionEvent = "loaded" | "saved";

/** One point in the profile's history. */
export interface ProfileVersion {
  id: string;
  /** ISO timestamp. */
  at: string;
  event: VersionEvent;
  roleTitles: string[];
  location: string;
  sources: { agentur: boolean; inbox: boolean; rssCount: number };
  /** Human summary of what moved since the previous entry. */
  changes: string[];
}

const STORAGE_KEY = "appfly.profile-versions.v1";
const MAX_ENTRIES = 50;

/**
 * Purpose: Read the ledger, tolerating a cleared or blocked localStorage.
 * Returns: Newest first.
 */
export function readVersionLedger(): ProfileVersion[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProfileVersion[]) : [];
  } catch {
    return [];
  }
}

/**
 * Purpose: Append a snapshot if it differs from the newest entry.
 * Inputs: The profile as it now stands, and why we are recording it.
 * Returns: The ledger after the write (newest first).
 * Does not: record a duplicate when nothing changed, so loading the app
 *           repeatedly does not spam the timeline.
 */
export function recordProfileSnapshot(
  profile: HuntProfile,
  event: VersionEvent,
): ProfileVersion[] {
  const ledger = readVersionLedger();
  const previous = ledger[0];
  const next: ProfileVersion = {
    id: `${Date.now()}-${event}`,
    at: new Date().toISOString(),
    event,
    roleTitles: profile.roleTitles,
    location: profile.location,
    sources: {
      agentur: profile.sources.agentur,
      inbox: profile.sources.inbox,
      rssCount: profile.sources.rss.length,
    },
    changes: [],
  };

  if (previous) {
    next.changes = diffVersions(previous, next);
    if (next.changes.length === 0) return ledger;
  } else {
    next.changes = ["First snapshot recorded"];
  }

  const updated = [next, ...ledger].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Private windows and blocked site data are fine; the timeline is a
    // convenience, not a source of truth.
  }
  return updated;
}

/** Purpose: Drop the local timeline. Does not: touch the vault or the API. */
export function clearVersionLedger(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — see recordProfileSnapshot.
  }
}

/**
 * Purpose: Describe, in words, what moved between two snapshots.
 * Does not: diff anything the backend cannot persist.
 */
function diffVersions(previous: ProfileVersion, next: ProfileVersion): string[] {
  const changes: string[] = [];

  const added = next.roleTitles.filter((title) => !previous.roleTitles.includes(title));
  const removed = previous.roleTitles.filter((title) => !next.roleTitles.includes(title));
  if (added.length) changes.push(`Added role ${added.join(", ")}`);
  if (removed.length) changes.push(`Removed role ${removed.join(", ")}`);

  if (previous.location !== next.location) {
    changes.push(`Location ${previous.location || "—"} → ${next.location || "—"}`);
  }
  if (previous.sources.agentur !== next.sources.agentur) {
    changes.push(`Arbeitsagentur ${next.sources.agentur ? "on" : "off"}`);
  }
  if (previous.sources.inbox !== next.sources.inbox) {
    changes.push(`_inbox clips ${next.sources.inbox ? "on" : "off"}`);
  }
  if (previous.sources.rssCount !== next.sources.rssCount) {
    changes.push(`RSS feeds ${previous.sources.rssCount} → ${next.sources.rssCount}`);
  }

  return changes;
}
