import { EmptyState } from "../../../shared/ui/EmptyState";
import { EmptyQueueState } from "../../../features/queue/states/EmptyQueueState";
import { RunFailedState } from "../../../features/workflow/states/RunFailedState";
import { GeminiRateLimitedState } from "../../../features/write/states/GeminiRateLimitedState";
import { SETTINGS_LINKS, type ShellRoute } from "./nav";
import styles from "./screens.module.css";

/** Fixture switch for FigJam 05 canvases (URL `?state=`). */
export type EdgeFixture = "empty-queue" | "run-failed" | "rate-limited" | null;

/**
 * Resolve a preview fixture from the query string without a router.
 */
export function fixtureFromSearch(search: string): EdgeFixture {
  const state = new URLSearchParams(search).get("state");
  if (state === "empty-queue" || state === "run-failed" || state === "rate-limited") {
    return state;
  }
  return null;
}

/**
 * Main column for a shell route. Desktop feature pages can replace these later.
 */
export function ShellScreen({
  route,
  fixture,
  onOpenSettings,
}: {
  route: ShellRoute;
  fixture: EdgeFixture;
  onOpenSettings: (route: ShellRoute) => void;
}) {
  if (fixture === "run-failed") {
    return <RunFailedState />;
  }
  if (fixture === "rate-limited") {
    return <GeminiRateLimitedState />;
  }
  if (fixture === "empty-queue" || route === "queue") {
    return <EmptyQueueState />;
  }

  switch (route) {
    case "tonight":
      return (
        <IdleCard
          kicker="Nightly"
          title="Tonight’s run is idle"
          body="Weekday 21:00 via launchd. Scout → match → write into the vault. You approve letters in Obsidian and submit applications yourself."
        />
      );
    case "workflow":
      return (
        <ol className={styles.steps}>
          <li>
            <strong>Scout</strong>
            <span>Agentur API, allowed RSS, local _inbox clips.</span>
          </li>
          <li>
            <strong>Match</strong>
            <span>Hard filters + local embeddings. No cloud JD dump.</span>
          </li>
          <li>
            <strong>Write</strong>
            <span>Gemini Flash, sealed packet, letter cap 5.</span>
          </li>
        </ol>
      );
    case "activity":
      return (
        <EmptyState kicker="Activity" title="No activity yet">
          <p>
            Run notes appear after <code>jobhunt run</code>. This screen never
            drives a browser on LinkedIn or Indeed.
          </p>
        </EmptyState>
      );
    case "memory":
      return (
        <IdleCard
          kicker="Vault"
          title="Memory stays in Obsidian"
          body="CV/Master.md, Voice-samples.md, and Requirements.md are the source of truth. This shell does not upload them to a job board."
        />
      );
    case "settings":
      return (
        <ul className={styles.settings}>
          {SETTINGS_LINKS.map((link) => (
            <li key={link.route}>
              <button type="button" onClick={() => onOpenSettings(link.route)}>
                <strong>{link.label}</strong>
                <span>{link.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      );
    case "settings-vault":
      return (
        <IdleCard
          kicker="Vault"
          title="Local Obsidian folder"
          body="Default ~/Documents/Job Search. Path is configured in config.yaml — this UI does not move secrets."
        />
      );
    case "settings-connectivity":
      return (
        <IdleCard
          kicker="Connectivity"
          title="IPC and Bridge"
          body="Banners above report browser offline, Local IPC, and Remote Bridge. Fix connectivity on the Mac; do not share job-board cookies."
        />
      );
    case "settings-keys":
      return (
        <IdleCard
          kicker="API keys"
          title="Write-only keys"
          body="Gemini and Jobsuche keys live in .env on the Mac. This screen will never echo a stored secret back."
        />
      );
  }
}

/**
 * Tablet aside: policy reminder so two-pane 768 layouts stay honest.
 */
export function PolicyAside() {
  return (
    <div className={styles.asideCopy}>
      <p className={styles.kicker}>Standing rules</p>
      <h2>Sealed writer packets</h2>
      <p>One job + CV slice per Gemini call. Human approval before submit.</p>
      <ul>
        <li>No Easy Apply bots</li>
        <li>No LinkedIn / Indeed / Stepstone crawl</li>
        <li>Inbox clips are local files only</li>
      </ul>
    </div>
  );
}

function IdleCard({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <EmptyState kicker={kicker} title={title}>
      <p>{body}</p>
    </EmptyState>
  );
}
