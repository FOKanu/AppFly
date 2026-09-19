import { useEffect, useMemo, useState } from "react";
import { retryGemini } from "./api";
import { GeminiRateLimitBanner } from "./GeminiRateLimitBanner";
import { HeartbeatPanel, type HeartbeatStateName } from "./HeartbeatPanel";
import { RequirementsPanel, type Guardrails } from "./RequirementsPanel";
import { SchedulePanel, WriterPanel, type NightlyPlan, type WriterMode } from "./SchedulePanel";
import { CrawlPolicyCard, SourcesPanel, type ScoutSource } from "./SourcesPanel";
import { useWorkflow } from "./useWorkflow";
import "./workflow.css";

/** Hosts `backend/src/jobhunt/policy.py` refuses. Read-only here on purpose. */
const BANNED_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "stepstone.de",
  "ziprecruiter.de",
  "xing.com",
  "glassdoor.de",
] as const;

/** Scout channels the copilot may read. None of them is a job board. */
const DEFAULT_SOURCES: ScoutSource[] = [
  {
    id: "agentur",
    name: "Arbeitsagentur Jobsuche API",
    detail: "official API",
    enabled: true,
  },
  { id: "rss", name: "RSS feeds", detail: "allow-listed feeds", enabled: true },
  { id: "inbox", name: "_inbox/ clips", detail: "manual drops · URLs never fetched", enabled: true },
  {
    id: "apify",
    name: "Apify · company pages",
    detail: "public company / Impressum only",
    enabled: false,
  },
];

const DEFAULT_PLAN: NightlyPlan = {
  start: "02:00",
  timezone: "Europe/Berlin",
  days: [false, false, true, false, false, false, false],
  lettersPerNight: 5,
  maxListings: 150,
  shortlistThreshold: 7,
};

const DEFAULT_GUARDRAILS: Guardrails = {
  locations: [],
  languages: [],
  requiredSkills: [],
  bannedTerms: [],
  skipCompanies: [],
  tone: "direct",
};

/**
 * Purpose: Workflow control plane — heartbeat and run controls, scout sources,
 *          nightly schedule and caps, writer model, and matcher guardrails.
 * Does not: persist the control plane yet. There is no write endpoint for it,
 *           so edits stay in this session until one lands.
 */
export function WorkflowPage() {
  const { snapshot } = useWorkflow();

  const [sources, setSources] = useState(DEFAULT_SOURCES);
  const [startUrls, setStartUrls] = useState<string[]>([]);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [writerMode, setWriterMode] = useState<WriterMode>("auto");
  const [guardrails, setGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [savedGuardrails, setSavedGuardrails] = useState(DEFAULT_GUARDRAILS);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    document.title = "AppFly · Workflow";
  }, []);

  const run = snapshot?.lastRun ?? null;
  const running = run?.status === "running";
  const state: HeartbeatStateName = heartbeatFor(run?.status, snapshot?.rateLimited);

  const unsavedCount = useMemo(
    () => countChanges(guardrails, savedGuardrails),
    [guardrails, savedGuardrails],
  );

  async function onRetry() {
    setRetrying(true);
    const result = await retryGemini();
    setRetryMessage(result.message);
    setRetrying(false);
  }

  return (
    <div className="workflow">
      {snapshot?.rateLimited ? (
        <GeminiRateLimitBanner
          onRetry={() => void onRetry()}
          busy={retrying}
          message={retryMessage}
        />
      ) : null}

      <HeartbeatPanel
        state={state}
        detail={heartbeatDetail(run)}
        nightlyOn={plan.days.some(Boolean)}
        onNightly={(on) => setPlan({ ...plan, days: plan.days.map(() => on) })}
        onRunNow={() => undefined}
        onStop={() => undefined}
        running={running}
      />

      <div className="workflow__columns">
        <div className="workflow__col">
          <SourcesPanel
            sources={sources}
            onToggle={(id, enabled) =>
              setSources((current) =>
                current.map((source) => (source.id === id ? { ...source, enabled } : source)),
              )
            }
            startUrls={startUrls}
            onAddStartUrl={(url) => setStartUrls((current) => [...current, url])}
          />
          <CrawlPolicyCard bannedHosts={BANNED_HOSTS} />
        </div>

        <div className="workflow__col">
          <SchedulePanel plan={plan} onChange={setPlan} />
          <WriterPanel
            mode={writerMode}
            onMode={setWriterMode}
            tokenHistory={[]}
            cloudLabel="gemini-2.5-flash"
            localLabel="llama3.1:8b (fallback)"
            fallbackNote={run?.errors[0]}
          />
        </div>

        <div className="workflow__col">
          <RequirementsPanel
            value={guardrails}
            onChange={setGuardrails}
            unsavedCount={unsavedCount}
            onDiscard={() => setGuardrails(savedGuardrails)}
            onSave={() => setSavedGuardrails(guardrails)}
            saveNote="Local to this session — the control-plane write endpoint is not wired yet."
          />
        </div>
      </div>
    </div>
  );
}

/** Map the run status onto the heartbeat state machine. */
function heartbeatFor(
  status: string | undefined,
  rateLimited: boolean | undefined,
): HeartbeatStateName {
  if (rateLimited) return "writing";
  switch (status) {
    case "running":
      return "hunting";
    case "failed":
      return "error";
    case "ok":
      return "waiting-for-you";
    default:
      return "asleep";
  }
}

function heartbeatDetail(run: { id: string; status: string; written: number } | null): string {
  if (!run) return "no run recorded · nothing needs review";
  const drafts = run.written > 0 ? `${run.written} drafts need review` : "no drafts need review";
  return `run ${run.id.slice(-5)} ${run.status} · ${drafts}`;
}

/** How many guardrail fields differ from what was last saved. */
function countChanges(next: Guardrails, saved: Guardrails): number {
  const keys = Object.keys(next) as (keyof Guardrails)[];
  return keys.filter((key) => JSON.stringify(next[key]) !== JSON.stringify(saved[key])).length;
}
