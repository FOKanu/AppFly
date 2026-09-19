import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../routes";
import { apiPost } from "../../shared/api/client";
import { Toast, useToast } from "../../shared/ui/Toast";
import {
  fetchSettings,
  profileFromSettings,
  saveSources,
  NOT_PERSISTED_NOTE,
} from "../profiles/api";
import type { HuntProfile } from "../profiles/types";
import { recordProfileSnapshot } from "../memory/versionLedger";
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

/** Schedule and caps live in config.yaml but PUT /settings cannot reach them. */
const SCHEDULE_NOTE =
  "Schedule and caps live in config.yaml, which PUT /settings does not expose. Edit the file directly for now.";

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
 * Does not: pretend to persist what PUT /settings cannot accept. Source toggles
 *           save for real; schedule, caps, writer and guardrails are read-only.
 */
export function WorkflowPage() {
  const { snapshot } = useWorkflow();
  const toast = useToast();

  const [profile, setProfile] = useState<HuntProfile | null>(null);
  const [savingSources, setSavingSources] = useState(false);
  const [plan] = useState(DEFAULT_PLAN);
  const [writerMode] = useState<WriterMode>("auto");
  const [guardrails] = useState(DEFAULT_GUARDRAILS);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    document.title = "AppFly · Workflow";
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((settings) => {
        if (!cancelled) setProfile(profileFromSettings(settings));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const run = snapshot?.lastRun ?? null;
  const state: HeartbeatStateName = running
    ? "hunting"
    : heartbeatFor(run?.status, snapshot?.rateLimited);

  const sources: ScoutSource[] = [
    {
      id: "agentur",
      name: "Arbeitsagentur Jobsuche API",
      detail: "official API",
      enabled: profile?.sources.agentur ?? false,
    },
    {
      id: "inbox",
      name: "_inbox/ clips",
      detail: "manual drops · URLs never fetched",
      enabled: profile?.sources.inbox ?? false,
    },
    {
      id: "rss",
      name: "RSS feeds",
      detail: `${profile?.sources.rss.length ?? 0} allow-listed feeds`,
      enabled: (profile?.sources.rss.length ?? 0) > 0,
      readOnly: true,
      reason: "Edit RSS feed URLs in config.yaml; this screen does not add feeds.",
    },
    {
      id: "apify",
      name: "Apify · company pages",
      detail: "public company / Impressum only",
      enabled: profile?.sources.apifyEnabled ?? false,
      readOnly: true,
      reason: "PUT /settings does not accept the Apify toggle, so it is read-only here.",
    },
  ];

  const onToggleSource = useCallback(
    async (id: string, enabled: boolean) => {
      if (id !== "agentur" && id !== "inbox") return;
      setSavingSources(true);
      try {
        const settings = await saveSources({ [id]: enabled });
        const next = profileFromSettings(settings);
        setProfile(next);
        recordProfileSnapshot(next, "saved");
        toast.show(`${id === "agentur" ? "Arbeitsagentur API" : "_inbox clips"} ${enabled ? "on" : "off"}.`);
      } catch {
        toast.show("Could not save the source toggle.");
      } finally {
        setSavingSources(false);
      }
    },
    [toast],
  );

  const onRunNow = useCallback(async () => {
    setRunning(true);
    try {
      const result = await apiPost<{ scouted: number; shortlisted: number; written: number }>(
        "/runs",
      );
      toast.show(
        `Run finished — scouted ${result.scouted}, shortlisted ${result.shortlisted}, wrote ${result.written}.`,
      );
    } catch {
      toast.show("Run failed — the local API is unreachable.");
    } finally {
      setRunning(false);
    }
  }, [toast]);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    const result = await retryGemini();
    setRetryMessage(result.message);
    setRetrying(false);
  }, []);

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
        detail={heartbeatDetail(run, running)}
        nightlyOn={plan.days.some(Boolean)}
        onNightly={() => undefined}
        nightlyReason={SCHEDULE_NOTE}
        onRunNow={() => void onRunNow()}
        onStop={() => undefined}
        stopReason="The API has no cancel endpoint; a run finishes on its own."
        running={running}
      />

      <div className="workflow__columns">
        <div className="workflow__col">
          <SourcesPanel
            sources={sources}
            onToggle={(id, enabled) => void onToggleSource(id, enabled)}
            saving={savingSources}
            startUrls={profile?.sources.apifyStartUrls ?? []}
          />
          <CrawlPolicyCard bannedHosts={BANNED_HOSTS} />
        </div>

        <div className="workflow__col">
          <SchedulePanel plan={plan} readOnlyReason={SCHEDULE_NOTE} />
          <WriterPanel
            mode={writerMode}
            readOnlyReason={SCHEDULE_NOTE}
            tokenHistory={[]}
            cloudLabel="gemini-2.5-flash"
            localLabel="llama3.1:8b (fallback)"
            fallbackNote={run?.errors[0]}
          />
        </div>

        <div className="workflow__col">
          <RequirementsPanel
            value={guardrails}
            readOnlyReason={NOT_PERSISTED_NOTE}
          />
          <p className="workflow__crosslink">
            Role titles and location are editable in{" "}
            <Link to={ROUTES.profiles}>Profiles</Link>.
          </p>
        </div>
      </div>

      <Toast message={toast.message} onDismiss={toast.dismiss} />
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

function heartbeatDetail(
  run: { id: string; status: string; written: number } | null,
  running: boolean,
): string {
  if (running) return "run in flight · started from this screen";
  if (!run) return "no run recorded · nothing needs review";
  const drafts = run.written > 0 ? `${run.written} drafts need review` : "no drafts need review";
  return `run ${run.id.slice(-5)} ${run.status} · ${drafts}`;
}
