import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { headerKicker, headerTitle } from "../nav-config";
import { ROUTES } from "../../routes";
import {
  apiGet,
  type HealthResponse,
  type JobSummary,
  type SystemStatusResponse,
} from "../../shared/api/client";
import { describeApiError, isUnreachable } from "../../shared/api/errors";
import { OfflineBanner } from "../../shared/ui/OfflineBanner";
import { Toast, useToast } from "../../shared/ui/Toast";
import { useBreakpoint } from "../../shared/useBreakpoint";
import { profileFromSettings } from "../../features/profiles/api";
import type { HuntProfile, SettingsPayload } from "../../features/profiles/types";
import { recordProfileSnapshot } from "../../features/memory/versionLedger";
import { listDocuments } from "../../features/vault/api";
import { ControlHeader } from "./ControlHeader";
import { RunningBar, type RunTelemetry } from "./RunningBar";
import { Sidebar } from "./Sidebar";
import { RunContext } from "../../shared/run/RunContext";
import { id5 } from "../../shared/run/format";
import { useRunController } from "../../shared/run/useRunController";

/** App version printed under the brand mark. */
const APP_VERSION = "0.4.2";

/** Statuses that count toward the Queue badge. */
const ACTIVE_QUEUE = new Set(["inbox", "shortlist", "draft", "approved"]);

const STUB_STATUS: SystemStatusResponse = {
  ipc: "unknown",
  ollama: "unknown",
  gemini: "unknown",
  vaultPath: "\u2014",
};

/** A2: reachability is unknown until the first /health answer; the banner shows only for "disconnected". */
type Connectivity = "unknown" | "connected" | "disconnected";

/**
 * Purpose: Persistent desktop chrome — sidebar rail, control header, scrolling
 *          content column and the mono running bar.
 * Does not: fetch a screen's data or display API keys.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { breakpoint } = useBreakpoint();
  const toast = useToast();

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [status, setStatus] = useState<SystemStatusResponse>(STUB_STATUS);
  const [queueCount, setQueueCount] = useState(0);
  const [connectivity, setConnectivity] = useState<Connectivity>("unknown");
  const [profiles, setProfiles] = useState<HuntProfile[]>([]);
  const [documentCount, setDocumentCount] = useState<number | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  /** Bumped when connectivity goes disconnected -> connected, so hydrate runs once more. */
  const [hydrateKey, setHydrateKey] = useState(0);
  const lastConnectivity = useRef<Connectivity>("unknown");

  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0] ?? null;

  const kicker = headerKicker(location.pathname, {
    queueCount,
    profileName: activeProfile?.name ?? "No profile",
    profileCount: profiles.length,
    today: formatToday(),
    documentCount,
  });
  const title = headerTitle(location.pathname);

  /** A1: reachability comes from /health alone. Any HTTP answer means the API is there. */
  const checkHealth = useCallback(async () => {
    try {
      const health = await apiGet<HealthResponse>("/health");
      setConnectivity("connected");
      setStatus((prev) => ({ ...prev, ipc: health.ok ? "ok" : "down" }));
    } catch (error) {
      const unreachable = isUnreachable(describeApiError(error, "Checking the local API").kind);
      setConnectivity(unreachable ? "disconnected" : "connected");
      setStatus((prev) => ({ ...prev, ipc: "down" }));
    }
  }, []);

  useEffect(() => {
    if (lastConnectivity.current === "disconnected" && connectivity === "connected") {
      setHydrateKey((key) => key + 1);
    }
    lastConnectivity.current = connectivity;
  }, [connectivity]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      await checkHealth();
      // A1: /settings and /jobs load on their own; a failure leaves only their fields unknown.
      try {
        const settings = await apiGet<SettingsPayload>("/settings");
        if (cancelled) return;
        const profile = profileFromSettings(settings);
        setStatus((prev) => ({
          ...prev,
          ollama: "unknown",
          ollamaDetail: "not probed",
          gemini: settings.secrets.gemini ? "ok" : "down",
          geminiDetail: settings.secrets.gemini ? "key set" : "no key",
          vaultPath: settings.vault_path || "\u2014",
        }));
        setProfiles([profile]);
        setActiveProfileId((current) => current ?? profile.id);
        // Seed the local version ledger so Memory has a baseline to diff against.
        recordProfileSnapshot(profile, "loaded");
      } catch {
        // Settings unavailable: gemini and the vault path stay unknown.
      }
      try {
        const jobs = await apiGet<JobSummary[]>("/jobs");
        if (!cancelled) setQueueCount(jobs.filter((job) => ACTIVE_QUEUE.has(job.status)).length);
      } catch {
        // Jobs unavailable: the queue badge keeps its last value.
      }
      // A3: the Vault breadcrumb shows a count only after a live list.
      const vault = await listDocuments().catch(() => null);
      if (!cancelled && vault?.availability === "live") {
        setDocumentCount(vault.documents.length);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [checkHealth, hydrateKey]);

  /** G11: the one run controller; RunContext hands it to Workflow (W2-B). A4: each poll and idle cycle re-checks /health. */
  const run = useRunController({ notify: toast.show, onTick: checkHealth });

  const onCopyVaultPath = useCallback(() => {
    const path = activeProfile?.vaultPath || status.vaultPath;
    void copyToClipboard(path).then((copied) =>
      toast.show(copied ? `Vault path copied — ${path}` : `Vault path: ${path}`),
    );
  }, [activeProfile, status.vaultPath, toast]);

  const onActivateProfile = useCallback(
    (id: string) => {
      setActiveProfileId(id);
      const next = profiles.find((profile) => profile.id === id);
      if (next) toast.show(`Tonight's run will use ${next.name}.`);
    },
    [profiles, toast],
  );

  const onSearchSubmit = useCallback(() => {
    const term = searchValue.trim();
    if (term) navigate(`${ROUTES.queue}?q=${encodeURIComponent(term)}`);
  }, [navigate, searchValue]);

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
        if (!run.runDisabled) run.start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run.runDisabled, run.start]);

  // G12: run #id5, window = elapsed, counts unknown until known, writer = model, tok stays a dash.
  const runTelemetry: RunTelemetry = {
    runId: run.runId ? `#${id5(run.runId)}` : undefined,
    window: run.elapsed || undefined,
    scouted: run.counts.scouted,
    matched: run.counts.matched,
    written: run.counts.written,
    writeCap: run.counts.writeCap,
    writer: run.model || undefined,
    nextNightly: "02:00",
  };

  return (
    <RunContext.Provider value={run}>
    <div className="app-shell" data-breakpoint={breakpoint}>
      <Sidebar
        queueCount={queueCount}
        profiles={profiles}
        activeProfileId={activeProfile?.id ?? null}
        onActivateProfile={onActivateProfile}
        onCopyVaultPath={onCopyVaultPath}
        status={status}
        version={APP_VERSION}
      />

      <div className="app-main-col">
        <ControlHeader
          kicker={kicker}
          title={title}
          heartbeat={run.led}
          heartbeatMessage={run.message}
          searchValue={searchValue}
          searchRef={searchRef}
          onSearchChange={setSearchValue}
          onSearchSubmit={onSearchSubmit}
          onRunNow={run.start}
          onStop={run.stop}
          runDisabled={run.runDisabled}
          runTitle={run.runTitle}
          stopDisabled={run.stopDisabled}
          stopLabel={run.stopLabel}
          stopTitle={run.stopTitle}
        />
        <main className="app-main" id="main">
          <OfflineBanner
            connectivity={{
              localIpc: connectivity === "disconnected" ? "disconnected" : "connected",
              remoteBridge: "connected",
            }}
          />
          <Outlet />
        </main>
      </div>

      <RunningBar
        state={run.led}
        message={run.message}
        liveMessage={run.liveMessage}
        telemetry={runTelemetry}
        runLink={run.linkToActivity}
        ipcConnected={connectivity !== "disconnected"}
      />

      <Toast message={toast.message} onDismiss={toast.dismiss} />
    </div>
    </RunContext.Provider>
  );
}

/**
 * Purpose: Copy text without assuming the Clipboard API is available.
 * Returns: whether the copy landed, so the caller can fall back to showing it.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Header date in the Figma format, e.g. "Wed 17 Sep". */
function formatToday(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date());
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
