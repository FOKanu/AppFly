import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { navItemForPath } from "../nav-config";
import {
  apiGet,
  apiPost,
  type HeartbeatResponse,
  type HeartbeatState,
  type QueueCountResponse,
  type RunCommandResponse,
  type SystemStatusResponse,
} from "../../shared/api/client";
import { ControlHeader } from "./ControlHeader";
import { RunningBar } from "./RunningBar";
import { Sidebar } from "./Sidebar";
import { SystemStatus } from "./SystemStatus";

const STUB_HEARTBEAT: HeartbeatResponse = {
  state: "waiting-for-you",
  message: "Waiting for you — review drafts in the vault",
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
        const [nextHeartbeat, nextStatus, nextQueue] = await Promise.all([
          apiGet<HeartbeatResponse>("/v1/heartbeat"),
          apiGet<SystemStatusResponse>("/v1/status"),
          apiGet<QueueCountResponse>("/v1/queue/count"),
        ]);
        if (cancelled) return;
        setHeartbeat(nextHeartbeat);
        setStatus({
          ipc: nextStatus.ipc,
          ollama: nextStatus.ollama,
          gemini: nextStatus.gemini,
          vaultPath: nextStatus.vaultPath || "—",
        });
        setQueueCount(Number.isFinite(nextQueue.count) ? nextQueue.count : 0);
        setApiReachable(true);
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
    void postCommand("/v1/run", "running", applyState);
  }, [applyState]);

  const onPauseNightly = useCallback(() => {
    applyState("paused", "Nightly paused");
    void postCommand("/v1/pause", "paused", applyState);
  }, [applyState]);

  const onStop = useCallback(() => {
    applyState("stopped", "Run stopped");
    void postCommand("/v1/stop", "stopped", applyState);
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
    <div className="app-shell">
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
        <Outlet />
      </main>
      <RunningBar state={heartbeat.state} message={heartbeat.message} />
      <SystemStatus status={status} apiReachable={apiReachable} />
    </div>
  );
}

/**
 * Purpose: Optimistic POST for run/pause/stop; keep chrome live if the API is down.
 * Does not: start Apify actors or scrape deny-listed hosts.
 */
async function postCommand(
  path: "/v1/run" | "/v1/pause" | "/v1/stop",
  fallback: HeartbeatState,
  applyState: (state: HeartbeatState, message?: string) => void,
): Promise<void> {
  try {
    const result = await apiPost<RunCommandResponse>(path);
    applyState(result.state ?? fallback, result.message);
  } catch {
    applyState(fallback);
  }
}

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
