import { apiGet, apiPut } from "../../shared/api/client";
import type { HuntProfile, ProfileCapabilities, SettingsPayload } from "./types";

/**
 * Fields `PUT /settings` actually accepts. Anything outside this set is
 * rejected by the backend, so the UI must not pretend it can save it.
 */
export const WRITABLE_SETTINGS = ["keywords", "location", "sources", "rss", "vault_path"] as const;

/**
 * Purpose: What the current backend can and cannot persist, in one place so
 *          every screen disables the same controls for the same reason.
 * Does not: guess — this mirrors `SettingsUpdate` in the API schema.
 */
export const CAPABILITIES: ProfileCapabilities = {
  roleTitles: true,
  location: true,
  sourceToggles: true,
  rssFeeds: true,
  vaultPath: true,
  // Present in config.yaml but absent from SettingsUpdate, so read-only here.
  apify: false,
  // No backend representation at all yet.
  salaryFloor: false,
  seniority: false,
  workMode: false,
  skipCompanies: false,
  bannedTerms: false,
  letterTone: false,
  schedule: false,
  writerMode: false,
  multipleProfiles: false,
};

/** Why a control is disabled, shown as its title and helper text. */
export const NOT_PERSISTED_NOTE =
  "The local API has no field for this yet — PUT /settings accepts role titles, location and source toggles only.";

/**
 * Purpose: Read the single search preset the API exposes.
 * Does not: read secrets; GET /settings returns booleans only.
 */
export async function fetchSettings(): Promise<SettingsPayload> {
  return apiGet<SettingsPayload>("/settings");
}

/**
 * Purpose: Persist the writable slice of a profile via PUT /settings.
 * Inputs: Only the keys the backend's SettingsUpdate allows.
 * Returns: The saved snapshot, so callers re-render from the server's truth.
 * Does not: send salary, seniority, work mode or skip companies — the backend
 *           rejects unknown keys outright.
 */
export async function saveProfile(patch: {
  keywords?: string[];
  location?: string;
}): Promise<SettingsPayload> {
  return apiPut<SettingsPayload>("/settings", patch);
}

/**
 * Purpose: Flip a scout source and persist it.
 * Does not: enable Apify — that toggle is not writable through this endpoint.
 */
export async function saveSources(patch: {
  agentur?: boolean;
  inbox?: boolean;
  rss?: string[];
}): Promise<SettingsPayload> {
  return apiPut<SettingsPayload>("/settings", { sources: patch });
}

/**
 * Purpose: Build the one hunt profile the API can describe today.
 * Inputs: A GET /settings snapshot.
 * Returns: A `HuntProfile`, shaped so a future /profiles endpoint returning
 *          many of them drops straight in.
 * Does not: invent extra presets to fill the list.
 */
export function profileFromSettings(settings: SettingsPayload): HuntProfile {
  const [primary, ...rest] = settings.keywords ?? [];
  return {
    id: "default",
    name: [primary, settings.location].filter(Boolean).join(" — ") || "Untitled preset",
    roleTitles: settings.keywords ?? [],
    location: settings.location ?? "",
    secondaryTitles: rest,
    vaultPath: settings.vault_path ?? "",
    sources: {
      agentur: settings.sources?.agentur ?? false,
      inbox: settings.sources?.inbox ?? false,
      rss: settings.sources?.rss ?? [],
      apifyEnabled: settings.sources?.apify?.enabled ?? false,
      apifyStartUrls: settings.sources?.apify?.start_urls ?? [],
    },
    health: {
      vaultExists: settings.health?.vault_exists ?? false,
      cvPresent: settings.health?.cv_present ?? false,
      requirementsPresent: settings.health?.requirements_present ?? false,
    },
  };
}
