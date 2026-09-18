import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { navItemForPath } from "../nav-config";
import {
  apiGet,
  apiPost,
  type HeartbeatResponse,
  type HeartbeatState,
  type HealthResponse,
  type JobSummary,
  type RunResponse,
  type SettingsSnapshot,
  type SystemStatusResponse,
} from "../../shared/api/client";
import { OfflineBanner } from "../../shared/ui/OfflineBanner";
import { useBreakpoint } from "../../shared/useBreakpoint";
import { ControlHeader } from "./ControlHeader";
import { RunningBar } from "./RunningBar";
import { Sidebar } from "./Sidebar";
import { SystemStatus } from "./SystemStatus";

const STUB_HEARTBEAT: HeartbeatResponse = {
  state: "idle",
  message: "Idle — no run in progress",
};

const STUB_STATUS: SystemStatusResponse = {
  ipc: "unknown",
  ollama: "unknown",
  gemini: "unknown",
  vaultPath: "—",
};

/**
 * Purpose: Persistent app chrome (sidebar + header + run bar + status).
 * Does not: fetch jobs or display API keys.
 */
export function AppShell() {
  const location = useLocation();
  const { breakpoint } = useBreakpoint();
  const navItem = navItemForPath(location.pathname);
  const title = navItem?.label ?? "Jobhunt Copilot";

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [heartbeat, setHeartbeat] = useState<HeartbeatResponse>(STUB_HEARTBEAT);
  const [status, setStatus] = useState<SystemStatusResponse>(STUB_STATUS);
  const [queueCount, setQueueCount] = useState(0);
  const [apiReachable, setApiReachable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [health, settings, jobs] = await Promise.all([
          apiGet<HealthResponse>("/health"),
          apiGet<SettingsSnapshot>("/settings"),
          apiGet<JobSummary[]>("/jobs"),
        ]);
        if (cancelled) return;
        setHeartbeat({
          state: "idle",
          message: health.ok ? "API live — idle" : "Idle — no run in progress",
        });
        setStatus({
          ipc: health.ok ? "ok" : "down",
          ollama: "unknown",
          gemini: settings.secrets.gemini ? "ok" : "down",
          vaultPath: settings.vault_path || "—",
        });
        setQueueCount(jobs.filter((job) => ACTIVE_QUEUE.has(job.status)).length);
        setApiReachable(health.ok);
      } catch {
        if (!cancelled) setApiReachable(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyState = useCallback((state: HeartbeatState, message?: string) => {
    setHeartbeat({ state, message: message ?? fallbackMessage(state) });
  }, []);

  const onRunNow = useCallback(() => {
    applyState("running", "Running nightly pipeline");
    void startPipeline(applyState);
  }, [applyState]);

  const onPauseNightly = useCallback(() => {
    applyState("paused", "Nightly paused");
  }, [applyState]);

  const onStop = useCallback(() => {
    applyState("stopped", "Run stopped");
  }, [applyState]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (metaK) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (isTypingTarget(target)) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        onRunNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRunNow]);

  return (
    <div className="app-shell" data-breakpoint={breakpoint}>
      <Sidebar queueCount={queueCount} />
      <ControlHeader
        title={title}
        heartbeat={heartbeat.state}
        heartbeatMessage={heartbeat.message}
        searchValue={searchValue}
        searchRef={searchRef}
        onSearchChange={setSearchValue}
        onRunNow={onRunNow}
        onPauseNightly={onPauseNightly}
        onStop={onStop}
        runDisabled={heartbeat.state === "running"}
      />
      <main className="app-main" id="main">
        <OfflineBanner
          connectivity={{
            localIpc: apiReachable ? "connected" : "disconnected",
            remoteBridge: "connected",
          }}
        />
        <Outlet />
      </main>
      <RunningBar state={heartbeat.state} message={heartbeat.message} />
      <SystemStatus status={status} apiReachable={apiReachable} />
    </div>
  );
}

/**
 * Purpose: POST /runs (same pipeline as `jobhunt run`); keep chrome live if the API is down.
 * Does not: start Apify actors or scrape deny-listed hosts.
 */
async function startPipeline(
  applyState: (state: HeartbeatState, message?: string) => void,
): Promise<void> {
  try {
    const result = await apiPost<RunResponse>("/runs");
    if (result.written > 0) {
      applyState("waiting-for-you", "Waiting for you — review drafts in the vault");
      return;
    }
    if (result.errors.length > 0) {
      applyState("stopped", result.errors[0]);
      return;
    }
    applyState("idle", `Run complete. Scouted ${result.scouted}, shortlisted ${result.shortlisted}.`);
  } catch {
    applyState("stopped", "Run failed — API unreachable");
  }
}

const ACTIVE_QUEUE = new Set(["inbox", "shortlist", "draft", "approved"]);

function fallbackMessage(state: HeartbeatState): string {
  switch (state) {
    case "running":
      return "Running nightly pipeline";
    case "waiting-for-you":
      return "Waiting for you — review drafts in the vault";
    case "paused":
      return "Nightly paused";
    case "stopped":
      return "Run stopped";
    default:
      return "Idle — no run in progress";
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
