/**
 * Purpose: Shapes for the Profiles screens — who you hunt as.
 * Does not: carry CV or letter bodies. Paths, counts and structure only.
 */

/** Raw GET /settings body, mirroring the backend's SettingsResponse. */
export interface SettingsPayload {
  vault_path: string;
  keywords: string[];
  location: string;
  sources: {
    agentur: boolean;
    inbox: boolean;
    rss: string[];
    apify: { enabled: boolean; start_urls: string[] };
  };
  health: {
    vault_exists: boolean;
    jobs_dir_exists: boolean;
    cv_present: boolean;
    requirements_present: boolean;
    config_file_exists: boolean;
  };
  /** Writer model from config (GET /settings, read-only). */
  gemini_model?: string;
  secrets: { gemini: boolean; apify: boolean; jobsuche: boolean };
  /** Letter cap from config (GET /settings, read-only). */
  letter_cap?: number;
  /** Shortlist size from config (GET /settings, read-only). */
  shortlist_size?: number;
}

/**
 * One search-preset profile. The API exposes exactly one today; the shape is
 * deliberately list-friendly so a future /profiles endpoint fits without a
 * rewrite of the screens.
 */
export interface HuntProfile {
  id: string;
  /** Display name, derived from the first role title and the location. */
  name: string;
  roleTitles: string[];
  location: string;
  /** Role titles after the first, shown as the preset's detail line. */
  secondaryTitles: string[];
  vaultPath: string;
  sources: {
    agentur: boolean;
    inbox: boolean;
    rss: string[];
    apifyEnabled: boolean;
    apifyStartUrls: string[];
  };
  health: {
    vaultExists: boolean;
    cvPresent: boolean;
    requirementsPresent: boolean;
  };
}

/**
 * Which profile fields the backend can actually persist right now.
 * Screens read this to decide between an enabled control and an honest
 * disabled one — never a control that looks live and silently drops the edit.
 */
export interface ProfileCapabilities {
  roleTitles: boolean;
  location: boolean;
  sourceToggles: boolean;
  rssFeeds: boolean;
  vaultPath: boolean;
  apify: boolean;
  salaryFloor: boolean;
  seniority: boolean;
  workMode: boolean;
  skipCompanies: boolean;
  bannedTerms: boolean;
  letterTone: boolean;
  schedule: boolean;
  writerMode: boolean;
  multipleProfiles: boolean;
}

/** A document the writer may be given. Paths and counts only, never bodies. */
export interface ProfileDocument {
  id: string;
  kind: "cv" | "voice" | "certification" | "portfolio";
  label: string;
  /** Vault-relative path, e.g. "CV/Master.md". */
  path: string;
  present: boolean;
  detail?: string;
}
