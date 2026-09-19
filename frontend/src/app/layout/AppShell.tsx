import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { headerKicker, headerTitle } from "../nav-config";
import { ROUTES } from "../../routes";
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
import { RunningBar, type RunTelemetry } from "./RunningBar";
import { Sidebar } from "./Sidebar";

/** App version printed under the brand mark. */
const APP_VERSION = "0.4.2";

/** Statuses that count toward the Queue badge. */
const ACTIVE_QUEUE = new Set(["inbox", "shortlist", "draft", "approved"]);

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
 * Purpose: Persistent desktop chrome — sidebar rail, control header, scrolling
 *          content column and the mono running bar.
 * Does not: fetch jobs for a screen or display API keys.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint } = useBreakpoint();

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [heartbeat, setHeartbeat] = useState<HeartbeatResponse>(STUB_HEARTBEAT);
  const [status, setStatus] = useState<SystemStatusResponse>(STUB_STATUS);
  const [queueCount, setQueueCount] = useState(0);
  const [apiReachable, setApiReachable] = useState(false);
  const [telemetry, setTelemetry] = useState<RunTelemetry>({ nextNightly: "02:00" });
  // The API carries one search preset today, so the shell shows that one.
  const [profile, setProfile] = useState({ name: "No profile", count: 0 });

  const kicker = headerKicker(location.pathname, {
    queueCount,
    profileName: profile.name,
    profileCount: profile.count,
    today: formatToday(),
  });
  const title = headerTitle(location.pathname);

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
          ollamaDetail: "not probed",
          gemini: settings.secrets.gemini ? "ok" : "down",
          geminiDetail: settings.secrets.gemini ? "key set" : "no key",
          vaultPath: settings.vault_path || "—",
        });
        setQueueCount(jobs.filter((job) => ACTIVE_QUEUE.has(job.status)).length);
        setProfile(profileFrom(settings));
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
    void startPipeline(applyState, setTelemetry);
  }, [applyState]);

  const onPauseNightly = useCallback(() => {
    applyState("paused", "Nightly paused");
  }, [applyState]);

  const onStop = useCallback(() => {
    applyState("stopped", "Run stopped");
  }, [applyState]);

  const onOpenProfiles = useCallback(() => {
    navigate(ROUTES.memory);
  }, [navigate]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const metaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (metaK) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        onRunNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRunNow]);

  const runTelemetry = useMemo<RunTelemetry>(
    () => ({ nextNightly: "02:00", ...telemetry }),
    [telemetry],
  );

  return (
    <div className="app-shell" data-breakpoint={breakpoint}>
      <Sidebar
        queueCount={queueCount}
        profileName={profile.name}
        status={status}
        version={APP_VERSION}
        onOpenProfiles={onOpenProfiles}
      />

      <div className="app-main-col">
        <ControlHeader
          kicker={kicker}
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
          stopDisabled={heartbeat.state !== "running"}
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
      </div>

      <RunningBar
        state={heartbeat.state}
        telemetry={runTelemetry}
        ipcConnected={apiReachable}
      />
    </div>
  );
}

/**
 * Purpose: POST /runs (same pipeline as `jobhunt run`); keep chrome live if the API is down.
 * Does not: start Apify actors or scrape deny-listed hosts.
 */
async function startPipeline(
  applyState: (state: HeartbeatState, message?: string) => void,
  setTelemetry: (next: RunTelemetry) => void,
): Promise<void> {
  try {
    const result = await apiPost<RunResponse>("/runs");
    setTelemetry({
      scouted: result.scouted,
      matched: result.shortlisted,
      written: result.written,
      nextNightly: "02:00",
    });
    if (result.written > 0) {
      applyState("waiting-for-you", "Waiting for you — review drafts in the vault");
      return;
    }
    if (result.errors.length > 0) {
      applyState("stopped", result.errors[0]);
      return;
    }
    applyState(
      "idle",
      `Run complete. Scouted ${result.scouted}, shortlisted ${result.shortlisted}.`,
    );
  } catch {
    applyState("stopped", "Run failed — API unreachable");
  }
}

/**
 * Purpose: Name the active search preset from what GET /settings exposes.
 * Does not: invent extra profiles — the API carries exactly one today.
 */
function profileFrom(settings: SettingsSnapshot): { name: string; count: number } {
  const keyword = settings.keywords?.[0];
  const location = settings.location;
  const name = [keyword, location].filter(Boolean).join(" — ");
  return name ? { name, count: 1 } : { name: "No profile", count: 0 };
}

/** Header date in the Figma format, e.g. "Wed 17 Sep". */
function formatToday(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());
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
