/**
 * Purpose: One run controller for the chrome and Workflow: start, stop, poll, re-attach (UI spec 4 to 6).
 * Does not: time out a run on the client, or show raw API errors.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiGet, apiPost } from "../api/client";
import { describeApiError, isUnreachable } from "../api/errors";
import { ACTIVE_UI, countsFor, formatElapsed, id5, ledFor, runMessage, uiFromStatus } from "./format";
import type { RunController } from "./RunContext";
import type { CvOption, RunAccepted, RunRow, RunStage, RunStatus, RunUiState } from "./types";
import type { VaultDocument } from "../../features/vault/types";

export interface RunControllerOptions {
  /** Show a toast. */
  notify: (text: string) => void;
  /** Called on every poll and on every 30 s idle cycle, so AppShell can re-check /health (A4). */
  onTick?: () => void;
}

/** States that keep polling `GET /runs/{id}`. */
const POLLABLE: ReadonlySet<RunUiState> = new Set<RunUiState>(["queued", "running", "cancelling", "lost-contact"]);

/** Purpose: useRun().stage: the last poll's B1 stage while that poll said running and the UI is still active. */
function stageOf(ui: RunUiState, status: RunStatus | null): RunStage | null {
  if (!ACTIVE_UI.has(ui) || status?.status !== "running") return null;
  const stage = status.stage;
  return stage === "scout" || stage === "match" || stage === "write" ? stage : null;
}

/**
 * Purpose: Find a live run to attach to (section 5). Now that B4 is merged, any active run row re-attaches.
 * Does not: throw; any failure reads as "none".
 */
async function findActiveRun(): Promise<RunRow | null> {
  try {
    const rows = await apiGet<RunRow[]>("/runs");
    return (
      rows.find(
        (row) =>
          (row.status === "queued" || row.status === "running") &&
          row.interrupted !== true,
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Purpose: The shared run state machine (spec section 4 table) behind useRun().
 * Does not: auto-clear terminal lines (G8); they stay until the next run or a reload.
 */
export function useRunController({ notify, onTick }: RunControllerOptions): RunController {
  const [ui, setUi] = useState<RunUiState>("idle");
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [model, setModel] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [startedMs, setStartedMs] = useState<number | null>(null);
  const [cancelSince, setCancelSince] = useState<number | null>(null);
  const [stopRequested, setStopRequested] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);
  const [cvId, setCvId] = useState<string | null>(null);
  const [cvOptions, setCvOptions] = useState<CvOption[]>([]);
  const [cvState, setCvState] = useState<"loading" | "ready" | "empty" | "error" | "offline">("loading");

  const uiRef = useRef<RunUiState>("idle");
  const startedRef = useRef<number | null>(null);
  const startBusyRef = useRef(false);
  const failuresRef = useRef(0);
  const notifyRef = useRef(notify);
  const onTickRef = useRef(onTick);
  const cvIdRef = useRef<string | null>(null);

  useEffect(() => {
    notifyRef.current = notify;
    onTickRef.current = onTick;
  }, [notify, onTick]);

  const moveTo = useCallback((next: RunUiState) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  const setStarted = useCallback((ms: number | null) => {
    startedRef.current = ms;
    setStartedMs(ms);
  }, []);

  /** Attach to a run id as queued (a poll moves it on). Used after POST, 409 and re-attach. */
  const attach = useCallback(
    (id: string, started?: string, acceptedModel?: string) => {
      failuresRef.current = 0;
      const parsed = started ? Date.parse(started) : Number.NaN;
      setRunId(id);
      setStatus(null);
      setModel(acceptedModel ?? "");
      setStarted(Number.isNaN(parsed) ? Date.now() : parsed);
      setNow(Date.now());
      setCancelSince(null);
      setStopRequested(false);
      moveTo("queued");
    },
    [moveTo, setStarted],
  );

  /** Render a polled status. A late queued/running poll never undoes `cancelling`. */
  const applyStatus = useCallback(
    (next: RunStatus) => {
      setStatus(next);
      if (next.model) setModel(next.model);
      const parsed = next.started ? Date.parse(next.started) : Number.NaN;
      if (!Number.isNaN(parsed)) setStarted(parsed);
      const mapped = uiFromStatus(next);
      if (uiRef.current === "cancelling" && (mapped === "queued" || mapped === "running")) return;
      moveTo(mapped);
    },
    [moveTo, setStarted],
  );

  /** Refresh CV options from the vault (metadata only; never /documents/{id}/text). */
  const refreshCvs = useCallback(async () => {
    try {
      setCvState("loading");
      const snapshot = await apiGet<VaultDocument[]>("/documents");
      const nextOptions: CvOption[] = snapshot
        .filter((doc) => doc.kind === "cv")
        .map((doc) => ({
          id: doc.id,
          label: doc.label,
          word_count: doc.word_count,
          active_cv: doc.active_cv,
          extract_status: doc.extract_status,
        }));

      setCvOptions(nextOptions);

      if (nextOptions.length === 0) {
        setCvId(null);
        cvIdRef.current = null;
        setCvState("empty");
        return;
      }

      const activeCv = nextOptions.find((cv) => cv.active_cv);
      const nextId = activeCv?.id ?? null;
      setCvId(nextId);
      cvIdRef.current = nextId;
      setCvState("ready");
    } catch (error) {
      if (isUnreachable(describeApiError(error, "Loading CVs").kind)) {
        setCvState("offline");
      } else {
        setCvState("error");
      }
      setCvOptions([]);
      setCvId(null);
      cvIdRef.current = null;
    }
  }, []);

  /** G4: the button and the R shortcut both call this; a no-op while Run now is disabled. */
  const start = useCallback(() => {
    if (startBusyRef.current || ACTIVE_UI.has(uiRef.current)) return;
    startBusyRef.current = true;
    setRunId(null);
    setStatus(null);
    setModel("");
    setStarted(null);
    setCancelSince(null);
    setStopRequested(false);
    moveTo("starting");

    void (async () => {
      try {
        const selected = cvIdRef.current;
        const accepted =
          selected !== null
            ? await apiPost<RunAccepted>("/runs", { cv: selected })
            : await apiPost<RunAccepted>("/runs");
        attach(accepted.id, accepted.started, accepted.model);
      } catch (error) {
        // G3: 409 -> attach to the active run named in the detail, else the active row.
        if (error instanceof ApiError && error.status === 409) {
          const match = /active: (\S+)$/.exec(error.detail);
          const id = match ? match[1] : (await findActiveRun())?.id;
          if (id) {
            notifyRef.current(`A run is already in progress (#${id5(id)}). Showing its progress.`);
            attach(id);
          } else {
            moveTo("idle");
            notifyRef.current("A run is already in progress, but AppFly couldn't find it. Refresh in a moment.");
          }
          return;
        }
        // G2: a timeout may still have started the run, so look once before giving up.
        const failure = describeApiError(error, "Starting the run");
        if (failure.kind === "timeout") {
          const row = await findActiveRun();
          if (row) {
            attach(row.id, row.started_at);
            return;
          }
        }
        // M3: CV id gone — toast, reload list, reset to active, idle.
        if (error instanceof ApiError && error.status === 404) {
          notifyRef.current("That CV is no longer in Vault. Switched back to your active CV.");
          await refreshCvs();
          moveTo("idle");
          return;
        }
        moveTo("idle");
        notifyRef.current(failure.message);
      } finally {
        startBusyRef.current = false;
      }
    })();
  }, [attach, moveTo, refreshCvs, setStarted]);

  /** Stop rules (section 4): cancel, 404 -> show the saved status, other error -> toast. */
  const stop = useCallback(() => {
    const id = runId;
    if (id === null || stopBusy) return;
    if (!(uiRef.current === "queued" || uiRef.current === "running")) return;
    setStopBusy(true);
    void (async () => {
      try {
        await apiPost<{ cancelled: boolean }>(`/runs/${encodeURIComponent(id)}/cancel`);
        setStopRequested(true);
        setCancelSince(Date.now());
        moveTo("cancelling");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          notifyRef.current("That run is no longer active on the API. Showing its last saved status.");
          try {
            applyStatus(await apiGet<RunStatus>(`/runs/${encodeURIComponent(id)}`));
          } catch {
            // Keep the prior state; the next poll or the idle re-read corrects it.
          }
        } else {
          notifyRef.current(describeApiError(error, "Stopping the run").message);
        }
      } finally {
        setStopBusy(false);
      }
    })();
  }, [applyStatus, moveTo, runId, status, stopBusy]);

  /** Section 5 re-attach; toasts only for a run started outside the app (B4 trigger). */
  const reattach = useCallback(async () => {
    const row = await findActiveRun();
    if (!row || ACTIVE_UI.has(uiRef.current)) return;
    if (row.trigger === "nightly" || row.trigger === "cli") {
      notifyRef.current(
        `A ${row.trigger === "cli" ? "CLI" : "nightly"} run started outside this page. Showing its progress.`,
      );
    }
    attach(row.id, row.started_at);
  }, [attach]);

  // Section 5: attach to a live run when the shell mounts.
  useEffect(() => {
    void reattach();
  }, [reattach]);

  // Section 5 + A4: while no run is active, every 30 s (visible tab only) re-check /health and re-read GET /runs.
  const idle = !ACTIVE_UI.has(ui);
  useEffect(() => {
    if (!idle) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      onTickRef.current?.();
      void reattach();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [idle, reattach]);

  // Section 5 polling: 1 s for the first minute, then 5 s, 15 s in a hidden tab, no client timeout.
  const polling = runId !== null && POLLABLE.has(ui);
  useEffect(() => {
    if (!polling || runId === null) return;
    const id = runId;
    let stopped = false;
    let timer = 0;

    function nextDelay(): number {
      if (document.visibilityState === "hidden") return 15_000;
      if (failuresRef.current >= 3) return 5_000;
      const started = startedRef.current ?? Date.now();
      return Date.now() - started < 60_000 ? 1_000 : 5_000;
    }

    async function tick() {
      onTickRef.current?.();
      try {
        const next = await apiGet<RunStatus>(`/runs/${encodeURIComponent(id)}`);
        if (stopped) return;
        failuresRef.current = 0;
        applyStatus(next);
      } catch (error) {
        if (stopped) return;
        const httpStatus = error instanceof ApiError ? error.status : 0;
        if (httpStatus >= 400 && httpStatus < 500) {
          // The API doesn't know this run (404 or another 4xx), so go back to idle.
          notifyRef.current("That run is no longer known to the API.");
          failuresRef.current = 0;
          setRunId(null);
          setStatus(null);
          setModel("");
          setStarted(null);
          setCancelSince(null);
          setStopRequested(false);
          moveTo("idle");
          return;
        }
        // A 5xx is not "unreachable": it keeps polling at the current interval and never counts toward lost contact.
        if (isUnreachable(describeApiError(error, "Checking the run").kind)) {
          failuresRef.current += 1;
          if (failuresRef.current >= 3) moveTo("lost-contact");
        }
      }
      if (stopped || !POLLABLE.has(uiRef.current)) return;
      timer = window.setTimeout(() => void tick(), nextDelay());
    }

    // First status at once on attach; later polls follow nextDelay().
    timer = window.setTimeout(() => void tick(), 0);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [applyStatus, moveTo, polling, runId, setStarted]);

  // The elapsed time ticks every second while a run is active.
  const active = ACTIVE_UI.has(ui);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [active]);

  // Load CVs on mount
  useEffect(() => {
    void refreshCvs();
  }, [refreshCvs]);

  const finishedMs = !active && status?.finished ? Date.parse(status.finished) : Number.NaN;
  const endMs = Number.isNaN(finishedMs) ? now : finishedMs;
  const elapsedMs = startedMs === null ? 0 : Math.max(0, endMs - startedMs);
  const { text, live } = runMessage({
    ui,
    runId,
    status,
    elapsedMs,
    cancellingMs: cancelSince === null ? 0 : now - cancelSince,
    finishedBeforeStop: stopRequested && (ui === "completed" || ui === "completed-empty"),
  });

  const setCvIdAndRef = useCallback((id: string | null) => {
    setCvId(id);
    cvIdRef.current = id;
  }, []);

  // Determine if run should be disabled based on CV state
  const selected = cvId !== null ? cvOptions.find((cv) => cv.id === cvId) : undefined;
  const selectedExtractBad =
    selected !== undefined && selected.extract_status !== undefined && selected.extract_status !== "ok";
  const runDisabled = active || cvState === "empty" || selectedExtractBad;

  // Set run title based on CV state
  let runTitle = "";
  if (ui === "lost-contact") {
    runTitle = "Waiting for the local API to answer.";
  } else if (active) {
    runTitle = "A run is already in progress.";
  } else if (cvState === "empty") {
    runTitle = "Add a CV in Vault before running.";
  } else if (selectedExtractBad) {
    runTitle = "Your active CV has no readable text. Pick another or re-upload in Vault.";
  }

  return {
    ui,
    runId,
    stage: stageOf(ui, status),
    message: text,
    liveMessage: live,
    led: ledFor(ui),
    counts: countsFor(status),
    model,
    elapsed: runId !== null && startedMs !== null ? formatElapsed(elapsedMs) : "",
    linkToActivity: runId !== null && active && elapsedMs >= 60_000,
    runDisabled,
    runTitle,
    stopDisabled: !(ui === "queued" || ui === "running") || stopBusy,
    stopLabel: ui === "cancelling" ? "Stopping\u2026" : "Stop",
    stopTitle: !active ? "No run in progress." : "",
    start,
    stop,
    cvId,
    setCvId: setCvIdAndRef,
    cvOptions,
    cvState,
    cvLabel: selected?.label ?? "",
  };
}
