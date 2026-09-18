import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { retryGemini } from "./api";
import { GeminiRateLimitBanner } from "./GeminiRateLimitBanner";
import { PipelineStepper } from "./PipelineStepper";
import { QueuedBehindMatch } from "./QueuedBehindMatch";
import { StageCard } from "./StageCard";
import { WorkflowEmpty } from "./WorkflowEmpty";
import { WorkflowFailed } from "./WorkflowFailed";
import { WorkflowRunning } from "./WorkflowRunning";
import { previewSnapshot, readPreview, useWorkflow } from "./useWorkflow";
import "./workflow.css";

/**
 * Workflow pipeline page: Scout → Match → Write, queued-behind-Match, Gemini retry.
 */
export function WorkflowPage() {
  const { search } = useLocation();
  const preview = readPreview(search);
  const { snapshot, source, loading } = useWorkflow();

  useEffect(() => {
    document.title = "AppFly · Workflow";
  }, []);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function onRetry() {
    setRetrying(true);
    const result = await retryGemini();
    setRetryMessage(result.message);
    setRetrying(false);
  }

  const previewData = preview ? previewSnapshot(preview) : null;
  const view = previewData ?? snapshot;

  let body: ReactNode;
  if (preview === "empty") {
    body = <WorkflowEmpty />;
  } else if (preview === "failed" || view?.lastRun?.status === "failed") {
    body = <WorkflowFailed />;
  } else if (preview === "running" || (loading && !preview)) {
    body = (
      <>
        <WorkflowRunning />
        {preview === "running" && view ? (
          <>
            <PipelineStepper stages={view.stages} />
            <div className="stage-grid">
              {view.stages.map((stage) => (
                <StageCard key={stage.id} stage={stage} />
              ))}
            </div>
            <QueuedBehindMatch jobs={view.queued} />
          </>
        ) : null}
      </>
    );
  } else if (!view?.lastRun) {
    body = <WorkflowEmpty />;
  } else {
    body = (
      <>
        {(view.rateLimited || preview === "rate_limited") && (
          <GeminiRateLimitBanner
            onRetry={onRetry}
            busy={retrying}
            message={retryMessage}
          />
        )}
        <PipelineStepper stages={view.stages} />
        <div className="stage-grid">
          {view.stages.map((stage) => (
            <StageCard key={stage.id} stage={stage} />
          ))}
        </div>
        <QueuedBehindMatch jobs={view.queued} />
      </>
    );
  }

  return (
    <section className="workflow" aria-label="Workflow pipeline">
      <header className="workflow-head">
        <div>
          <p className="kicker">Pipeline</p>
          <h1>Workflow</h1>
        </div>
        <p className="workflow-health">
          <span className={source === "api" ? "led led-live" : "led led-mock"} />
          {source === "api" ? "API live" : "Mock fallback"}
        </p>
      </header>
      <p className="preview-strip">
        Preview
        <Link to="/workflow" aria-current={!preview ? "page" : undefined}>
          live
        </Link>
        <Link to="/workflow?preview=empty" aria-current={preview === "empty" ? "page" : undefined}>
          empty
        </Link>
        <Link
          to="/workflow?preview=running"
          aria-current={preview === "running" ? "page" : undefined}
        >
          running
        </Link>
        <Link to="/workflow?preview=failed" aria-current={preview === "failed" ? "page" : undefined}>
          failed
        </Link>
        <Link
          to="/workflow?preview=rate_limited"
          aria-current={preview === "rate_limited" ? "page" : undefined}
        >
          rate-limit
        </Link>
      </p>
      {body}
    </section>
  );
}
