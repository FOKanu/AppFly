import type { Job, Run, Stage, WorkflowSnapshot } from "./types";

/** Inbox jobs waiting on Match. */
export const MOCK_QUEUED: Job[] = [
  {
    source_id: "inbox-1",
    source: "clips",
    title: "Full-Stack Engineer",
    company: "Personio",
    location: "Munich",
    status: "inbox",
  },
  {
    source_id: "inbox-2",
    source: "api",
    title: "Python Engineer",
    company: "Wolt",
    location: "Berlin",
    status: "inbox",
  },
  {
    source_id: "inbox-3",
    source: "rss",
    title: "Backend Engineer",
    company: "Celonis",
    location: "Munich",
    status: "inbox",
  },
];

const stagesDone: Stage[] = [
  { id: "scout", label: "Scout", status: "done", count: 24, detail: "API · RSS · clips" },
  { id: "match", label: "Match", status: "done", count: 8, detail: "8 shortlist · 16 skipped" },
  { id: "write", label: "Write", status: "done", count: 5, detail: "5 letters · cap 5" },
];

/** Default mock run after a successful nightly. */
export const MOCK_RUN: Run = {
  id: "run-2026-09-17",
  started_at: "2026-09-17T21:00:00+02:00",
  finished_at: "2026-09-17T21:12:00+02:00",
  status: "ok",
  scouted: 24,
  shortlisted: 8,
  skipped: 16,
  written: 5,
  write_skipped: 1,
  errors: [],
  gemini: "ok",
  stages: { scout: "done", match: "done", write: "done" },
};

/** Workflow snapshot used when GET endpoints are unreachable. */
export const MOCK_WORKFLOW: WorkflowSnapshot = {
  health: { ok: false, api: "down", gemini: "ready" },
  lastRun: MOCK_RUN,
  stages: stagesDone,
  queued: MOCK_QUEUED,
  rateLimited: false,
};

/** Running pipeline: Match live, Write queued. */
export const MOCK_RUNNING: WorkflowSnapshot = {
  health: { ok: true, api: "up", gemini: "ready" },
  lastRun: { ...MOCK_RUN, status: "running", finished_at: undefined, written: 0, gemini: "ok" },
  stages: [
    { id: "scout", label: "Scout", status: "done", count: 24, detail: "ingest complete" },
    { id: "match", label: "Match", status: "running", count: 4, detail: "scoring inbox" },
    { id: "write", label: "Write", status: "queued", count: 0, detail: "queued behind Match" },
  ],
  queued: MOCK_QUEUED,
  rateLimited: false,
};

/** Gemini 429 fixture. */
export const MOCK_RATE_LIMITED: WorkflowSnapshot = {
  health: { ok: true, api: "up", gemini: "rate_limited" },
  lastRun: {
    ...MOCK_RUN,
    written: 2,
    gemini: "rate_limited",
    errors: ["write: Gemini 429"],
    stages: { scout: "done", match: "done", write: "rate_limited" },
  },
  stages: [
    { id: "scout", label: "Scout", status: "done", count: 24, detail: "API · RSS · clips" },
    { id: "match", label: "Match", status: "done", count: 8, detail: "shortlist sealed" },
    {
      id: "write",
      label: "Write",
      status: "rate_limited",
      count: 2,
      detail: "Gemini rate-limited · 3 waiting",
    },
  ],
  queued: MOCK_QUEUED,
  rateLimited: true,
};

/** Failed fixture — API down. */
export const MOCK_FAILED: WorkflowSnapshot = {
  health: { ok: false, api: "down", gemini: "missing" },
  lastRun: {
    ...MOCK_RUN,
    status: "failed",
    written: 0,
    errors: ["scout: API down"],
    gemini: "down",
    stages: { scout: "failed", match: "idle", write: "idle" },
  },
  stages: [
    { id: "scout", label: "Scout", status: "failed", count: 0, detail: "API down" },
    { id: "match", label: "Match", status: "idle", count: 0, detail: "blocked" },
    { id: "write", label: "Write", status: "idle", count: 0, detail: "blocked" },
  ],
  queued: [],
  rateLimited: false,
};
