import { EmptyState } from "../../../shared/ui/EmptyState";

/**
 * FigJam 05 failed nightly/workflow run. The human still submits applications.
 */
export function RunFailedState() {
  return (
    <EmptyState
      kicker="Workflow"
      title="Tonight’s run failed"
      icon={<FailIcon />}
    >
      <p>
        Scout, match, or write did not finish. Open today’s note under{" "}
        <code>Runs/</code> in the vault. Existing job notes were not duplicated.
      </p>
      <p>
        Nothing was submitted. You always apply in the browser yourself — this
        copilot has no Easy Apply bot.
      </p>
    </EmptyState>
  );
}

/** Decorative failure glyph for a broken workflow run. */
export function FailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 3h2v11h-2V3Zm0 13h2v3h-2v-3Z"
      />
    </svg>
  );
}
