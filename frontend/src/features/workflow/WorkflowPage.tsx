import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../routes";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { Toast, useToast } from "../../shared/ui/Toast";
import {
  fetchSettings,
  profileFromSettings,
  saveSources,
} from "../profiles/api";
import type { HuntProfile } from "../profiles/types";
import { recordProfileSnapshot } from "../memory/versionLedger";
import { GeminiRateLimitBanner } from "./GeminiRateLimitBanner";
import { HeartbeatPanel, type HeartbeatStateName } from "./HeartbeatPanel";
import { RequirementsPanel } from "./RequirementsPanel";
import { SchedulePanel, WriterPanel, type NightlyPlan, type WriterMode } from "./SchedulePanel";
import { CrawlPolicyCard, SourcesPanel, type ScoutSource } from "./SourcesPanel";
import { useWorkflow } from "./useWorkflow";
import { useRun, type RunController } from "../../shared/run/RunContext";
import { ACTIVE_UI, id5 } from "../../shared/run/format";
import type { Run } from "./types";
import "./workflow.css";

import { ApiError } from "../../shared/api/client";
import { fetchRequirements, saveRequirements, sameDraft, toDraft, type RequirementsDraft } from "./requirementsApi";

import { BANNED_HOSTS } from "../../shared/policy";
import { writerLabel } from "../../shared/writerLabel";

/** Schedule and caps live in config.yaml but PUT /settings cannot reach them. */
const SCHEDULE_NOTE =
  "The schedule comes from the launchd job (launchd/com.jobhunt.nightly.plist). Caps come from config.yaml. Neither can be changed here yet.";

const DEFAULT_PLAN: NightlyPlan = {
  start: "21:00",
  days: [true, true, true, true, true, false, false],
  lettersPerRun: null,
  shortlistSize: null,
};

const EMPTY_DRAFT: RequirementsDraft = {
  locations: [],
  salary_floor: 0,
  languages: [],
  banned_terms: [],
  skip_companies: [],
  must_have: [],
  nice_to_have: [],
  tone: "",
};

/**
 * Purpose: Workflow control plane — heartbeat and run controls, scout sources,
 *          nightly schedule and caps, writer model.
 * Does not: pretend to persist what PUT /settings cannot accept. Source toggles
 *           save for real; schedule, caps, writer are read-only.
 */
export function WorkflowPage() {
  const { snapshot, source, failure, reload } = useWorkflow();
  const toast = useToast();
  const { hash } = useLocation();

  const [profile, setProfile] = useState<HuntProfile | null>(null);
  const [savingSources, setSavingSources] = useState(false);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [writerMode] = useState<WriterMode>("cloud");
  const [writerModel, setWriterModel] = useState<string | null>(null);

  const [reqState, setReqState] = useState<"loading"|"ready"|"error">("loading");
  const [storageBackend, setStorageBackend] = useState<string|null>(null);
  const [savedReq, setSavedReq] = useState<RequirementsDraft>(EMPTY_DRAFT);
  const [draftReq, setDraftReq] = useState<RequirementsDraft>(EMPTY_DRAFT);
  const [savingReq, setSavingReq] = useState(false);
  const [reqError, setReqError] = useState<string|null>(null);

  useEffect(() => {
    document.title = "AppFly · Workflow";
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((settings) => {
        if (!cancelled) {
          setProfile(profileFromSettings(settings));
          setWriterModel(settings.gemini_model ?? null);
          setPlan((p) => ({
            ...p,
            lettersPerRun: settings.letter_cap ?? null,
            shortlistSize: settings.shortlist_size ?? null
          }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRequirements()
      .then((p) => {
        if (!cancelled) {
          setStorageBackend(p.storage_backend);
          setSavedReq(toDraft(p));
          setDraftReq(toDraft(p));
          setReqState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReqState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useRun();
  // Refresh the snapshot once each time the run leaves an active state.
  const wasActive = useRef(false);
  useEffect(() => {
    const active = ACTIVE_UI.has(run.ui);
    if (wasActive.current && !active) reload();
    wasActive.current = active;
  }, [run.ui, reload]);
  const lastRun = snapshot?.lastRun ?? null;
  const view = heartbeatView(run, lastRun, snapshot?.rateLimited ?? false);

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

  const reqDirty = !sameDraft(savedReq, draftReq);

  const onSaveRequirements = useCallback(async () => {
    setSavingReq(true);
    setReqError(null);
    try {
      const p = await saveRequirements(draftReq);
      setStorageBackend(p.storage_backend);
      setSavedReq(toDraft(p));
      setDraftReq(toDraft(p));
      toast.show("Requirements saved. They apply from the next run.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setReqError("A run is in progress. Your edits are kept. Save again when it finishes.");
      } else if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        setReqError(`Not saved: ${error.detail}`);
      } else {
        setReqError("Not saved. The local API did not answer. Your edits are kept.");
      }
    } finally {
      setSavingReq(false);
    }
  }, [draftReq, toast]);

  useEffect(() => {
    if (!hash || reqState === "loading") return;
    const target = document.getElementById(hash.slice(1));
    target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [hash, reqState]);

  return (
    <div className="workflow">
      {source === "mock" ? <SampleDataBanner noun="runs" /> : null}
      {source === "error" && failure ? (
        <Banner tone="danger" title="Couldn't load Workflow" role="alert">
          {failure.message}
        </Banner>
      ) : null}
      {snapshot?.rateLimited ? (
        <GeminiRateLimitBanner
          onRunAgain={run.start}
          disabled={run.runDisabled}
          title={run.runTitle}
        />
      ) : null}

      <HeartbeatPanel
        activeStep={view.activeStep}
        label={view.label}
        dataState={view.dataState}
        detail={view.detail}
        detailLink={view.detailLink}
        inFlight={ACTIVE_UI.has(run.ui)}
        onRunNow={run.start}
        runDisabled={run.runDisabled}
        runTitle={run.runTitle}
        onStop={run.stop}
        stopDisabled={run.stopDisabled}
        stopTitle={run.stopTitle}
        stopping={run.ui === "cancelling"}
        cvUsingLabel={run.cvLabel}
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
            cloudLabel={writerLabel(writerModel)}
            fallbackNote={lastRun?.errors[0]}
          />
        </div>

        <div className="workflow__col">
          <RequirementsPanel
            state={reqState}
            storageBackend={storageBackend}
            value={draftReq}
            onChange={(next) => {
              setDraftReq(next);
              setReqError(null);
            }}
            dirty={reqDirty}
            saving={savingReq}
            error={reqError}
            onSave={onSaveRequirements}
            onRevert={() => {
              setDraftReq(savedReq);
              setReqError(null);
            }}
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

/** What the HeartbeatPanel shows for one shared run state (spec H1 and H2). */
interface HeartbeatView {
  activeStep: HeartbeatStateName | null;
  label: string;
  dataState: HeartbeatStateName;
  detail: string;
  detailLink: boolean;
}

/** Purpose: H1 step + label and H2 detail line from useRun() and the last loaded run. */
function heartbeatView(run: RunController, lastRun: Run | null, rateLimited: boolean): HeartbeatView {
  const id = run.runId ? id5(run.runId) : "";
  const lit = (step: HeartbeatStateName, detail: string): HeartbeatView => ({
    activeStep: step,
    label: step,
    dataState: step,
    detail,
    detailLink: false,
  });
  switch (run.ui) {
    case "idle":
      // Fixture-only rate limit wins while idle; otherwise the last run decides (H1 idle row).
      return lit(rateLimited ? "writing" : idleStep(lastRun), idleDetail(lastRun));
    case "starting":
      return lit("waking", "starting a run\u2026");
    case "queued":
      return lit("waking", `run #${id} queued`);
    case "running": {
      // H1 with B1: the reported stage lights its step; before the first stage report none is lit.
      const step = stepForStage(run.stage);
      return {
        activeStep: step,
        label: step ?? "running",
        dataState: step ?? "hunting",
        detail: `run #${id} in flight \u00b7 ${run.elapsed}`,
        detailLink: run.linkToActivity,
      };
    }
    case "cancelling": {
      // The stage's step stays lit while the run finishes its current step.
      const step = stepForStage(run.stage);
      return {
        activeStep: step,
        label: "stopping",
        dataState: step ?? "hunting",
        detail: `stopping run #${id} \u00b7 finishing the current ${run.stage === "write" ? "letter" : "step"}`,
        detailLink: false,
      };
    }
    case "lost-contact":
      return { activeStep: null, label: "lost contact", dataState: "error", detail: run.message, detailLink: false };
    case "completed":
    case "problems":
      return lit("waiting-for-you", run.message);
    case "completed-empty":
    case "cancelled":
      return lit("asleep", run.message);
    case "failed":
      return lit("error", run.message);
    case "interrupted":
      return lit("error", `run #${id} interrupted \u00b7 the process stopped mid-run`);
  }
}

/** Purpose: H1 step for a B1 stage: scout -> hunting, match -> matching, write -> writing, none -> null. */
function stepForStage(stage: RunController["stage"]): HeartbeatStateName | null {
  if (stage === "scout") return "hunting";
  if (stage === "match") return "matching";
  if (stage === "write") return "writing";
  return null;
}

/** Purpose: H1 idle row: the step implied by the last pipeline run. */
function idleStep(lastRun: Run | null): HeartbeatStateName {
  if (!lastRun) return "asleep";
  if (lastRun.status === "completed_with_errors") return "waiting-for-you";
  if (lastRun.status === "completed" && (lastRun.written ?? 0) > 0) return "waiting-for-you";
  if (lastRun.status === "failed") return "error";
  return "asleep";
}

/** H2 status words for the idle line. */
const LAST_RUN_WORD: Record<string, string> = {
  completed: "done",
  completed_with_errors: "finished with problems",
  ok: "done",
  failed: "failed",
  cancelled: "stopped",
};

/** Purpose: H2 idle detail: `last run #{id5} {word} \u00b7 ...` or the no-run line. */
function idleDetail(lastRun: Run | null): string {
  if (!lastRun) return "no run recorded \u00b7 nothing needs review";
  const word = LAST_RUN_WORD[lastRun.status] ?? lastRun.status;
  const written = lastRun.written ?? 0;
  const drafts = written > 0 ? `${written} draft(s) to review` : "no drafts to review";
  return `last run #${id5(lastRun.id)} ${word} \u00b7 ${drafts}`;
}
