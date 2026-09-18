import type { Job, Run, TonightSnapshot } from "./types";

const lastNight = "2026-09-17T21:00:00+02:00";
const lastNightEnd = "2026-09-17T21:12:00+02:00";

/** Fixture drafts so the dashboard renders when the API is missing. */
export const MOCK_DRAFTS: Job[] = [
  {
    source_id: "agentur-1",
    source: "api",
    title: "Senior Python Engineer",
    company: "Delivery Hero",
    location: "Berlin",
    status: "draft",
    score: 0.86,
  },
  {
    source_id: "agentur-2",
    source: "api",
    title: "Platform Engineer",
    company: "Zalando",
    location: "Berlin",
    status: "draft",
    score: 0.81,
  },
  {
    source_id: "rss-1",
    source: "rss",
    title: "Backend Engineer",
    company: "HelloFresh",
    location: "Berlin",
    status: "draft",
    score: 0.78,
  },
  {
    source_id: "clip-1",
    source: "clips",
    title: "Software Engineer",
    company: "Trade Republic",
    location: "Berlin",
    status: "draft",
    score: 0.74,
  },
];

/** Fixture shortlist used for pipeline counts. */
export const MOCK_SHORTLIST: Job[] = [
  {
    source_id: "agentur-3",
    source: "api",
    title: "Data Platform Engineer",
    company: "N26",
    location: "Berlin",
    status: "shortlist",
    score: 0.72,
  },
  {
    source_id: "agentur-4",
    source: "api",
    title: "Site Reliability Engineer",
    company: "SoundCloud",
    location: "Berlin",
    status: "shortlist",
    score: 0.7,
  },
];

/** Successful last-night run used as the default mock. */
export const MOCK_RUN: Run = {
  id: "run-2026-09-17",
  started_at: lastNight,
  finished_at: lastNightEnd,
  status: "ok",
  scouted: 24,
  shortlisted: 8,
  skipped: 16,
  written: 5,
  write_skipped: 1,
  errors: [],
  source_mix: { api: 18, rss: 4, clips: 2 },
  stages: { scout: "done", match: "done", write: "done" },
};

/** Running fixture for the Tonight running state. */
export const MOCK_RUNNING_RUN: Run = {
  ...MOCK_RUN,
  id: "run-live",
  status: "running",
  finished_at: undefined,
  written: 0,
  stages: { scout: "done", match: "running", write: "queued" },
};

/** Failed fixture — API down during last run. */
export const MOCK_FAILED_RUN: Run = {
  ...MOCK_RUN,
  id: "run-failed",
  status: "failed",
  written: 0,
  errors: ["write: API down"],
  stages: { scout: "done", match: "done", write: "failed" },
};

/** Default Tonight snapshot when GET endpoints are unreachable. */
export const MOCK_TONIGHT: TonightSnapshot = {
  health: { ok: false, api: "down" },
  lastRun: MOCK_RUN,
  drafts: MOCK_DRAFTS,
  shortlist: MOCK_SHORTLIST,
};
