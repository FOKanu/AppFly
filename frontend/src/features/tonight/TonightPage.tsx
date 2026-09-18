import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { DraftsWaiting } from "./DraftsWaiting";
import { PipelineSnapshot } from "./PipelineSnapshot";
import { RunSummary } from "./RunSummary";
import { SourceMix } from "./SourceMix";
import { TonightEmpty } from "./TonightEmpty";
import { TonightFailed } from "./TonightFailed";
import { TonightRunning } from "./TonightRunning";
import { readPreview, useTonight } from "./useTonight";
import "./tonight.css";

/**
 * Tonight home dashboard: last run, drafts waiting, source mix, pipeline snapshot.
 */
export function TonightPage() {
  const { search } = useLocation();
  const preview = readPreview(search);
  const { snapshot, source, loading } = useTonight();

  useEffect(() => {
    document.title = "AppFly · Tonight";
  }, []);

  let body: ReactNode;
  if (preview === "empty") {
    body = <TonightEmpty />;
  } else if (preview === "running" || (loading && !preview)) {
    body = <TonightRunning />;
  } else if (preview === "failed" || snapshot?.lastRun?.status === "failed") {
    body = <TonightFailed run={snapshot?.lastRun ?? null} />;
  } else if (!snapshot?.lastRun) {
    body = <TonightEmpty />;
  } else {
    body = (
      <div className="tonight-grid">
        <RunSummary run={snapshot.lastRun} source={source} />
        <DraftsWaiting drafts={snapshot.drafts} />
        <SourceMix mix={snapshot.lastRun.source_mix} />
        <PipelineSnapshot run={snapshot.lastRun} />
      </div>
    );
  }

  return (
    <main className="tonight" aria-label="Tonight dashboard">
      <header className="tonight-head">
        <div>
          <p className="kicker">Home</p>
          <h1>Tonight</h1>
        </div>
        <p className="tonight-health">
          <span className={source === "api" ? "led led-live" : "led led-mock"} />
          {source === "api" ? "API live" : "Mock fallback"}
        </p>
      </header>
      <p className="preview-strip">
        Preview
        <Link to="/" aria-current={!preview ? "page" : undefined}>
          live
        </Link>
        <Link to="/?preview=empty" aria-current={preview === "empty" ? "page" : undefined}>
          empty
        </Link>
        <Link to="/?preview=running" aria-current={preview === "running" ? "page" : undefined}>
          running
        </Link>
        <Link to="/?preview=failed" aria-current={preview === "failed" ? "page" : undefined}>
          failed
        </Link>
      </p>
      {body}
    </main>
  );
}
