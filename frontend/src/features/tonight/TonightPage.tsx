import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { Toast, useToast } from "../../shared/ui/Toast";
import { copyToClipboard } from "../../app/layout/AppShell";
import { patchJobStatus } from "../queue/jobsApi";
import { ACTIVE_UI } from "../../shared/run/format";
import { useRun } from "../../shared/run/RunContext";
import type { JobStatus } from "../queue/types";
import { LastRunSummary } from "./LastRunSummary";
import { NeedsYou } from "./NeedsYou";
import { PipelineOrganism } from "./PipelineOrganism";
import { TonightHero } from "./TonightHero";
import { liveRun, refusalsOf } from "./api";
import { readPreview, useTonight } from "./useTonight";
import type { Job } from "./types";
import { fetchSettings } from "../profiles/api";
import "./tonight.css";

/**
 * Purpose: Tonight — what the pipeline did last night and what needs a human.
 * Does not: submit applications, crawl job boards, or render CV markdown.
 */
export function TonightPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const preview = readPreview(search);
  const { snapshot, source, failure, loading, reload } = useTonight();

  // Approve/deny write through to the API, so the list has to update locally.
  const [decided, setDecided] = useState<Record<string, JobStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [writerModel, setWriterModel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then((settings) => {
        if (!cancelled) setWriterModel(settings.gemini_model ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = "AppFly · Tonight";
  }, []);

  const shared = useRun();
  // D1: while a run is active Tonight reads the shared controller, not the loader.
  const active = ACTIVE_UI.has(shared.ui);
  // D4: reload the snapshot once each time the run leaves an active state, so the finished run shows.
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) reload();
    wasActive.current = active;
  }, [active, reload]);
  const run = active
    ? liveRun(shared.runId, shared.ui, shared.counts, shared.stage)
    : preview === "empty"
      ? null
      : (snapshot?.lastRun ?? null);
  const allDrafts = preview === "empty" ? [] : (snapshot?.drafts ?? []);
  const drafts = allDrafts.filter((job) => !decided[job.source_id]);
  // D6: only real crawl refusals count; null when the run does not report error strings.
  const refusals = refusalsOf(run);

  const onReviewDrafts = useCallback(() => {
    navigate(`${ROUTES.queue}?status=draft`);
  }, [navigate]);

  const onOpenHome = useCallback(() => {
    const path = `${snapshot?.vaultPath ?? ""}/Home.md`.replace(/^\//, "");
    void copyToClipboard(path).then((copied) =>
      toast.show(
        copied ? `Path copied — ${path}` : `Home note: ${path}`,
      ),
    );
  }, [snapshot?.vaultPath, toast]);

  const decide = useCallback(
    async (job: Job, status: JobStatus) => {
      setBusyId(job.source_id);
      try {
        await patchJobStatus(job.source_id, status);
        setDecided((current) => ({ ...current, [job.source_id]: status }));
        toast.show(
          status === "approved"
            ? `${job.title} approved — submit it yourself in the browser.`
            : `${job.title} denied.`,
        );
      } catch {
        toast.show(`Could not save ${job.title}. The local API rejected the change.`);
      } finally {
        setBusyId(null);
      }
    },
    [toast],
  );

  return (
    <div className="tonight" aria-busy={loading || undefined}>
      {preview ? <PreviewStrip active={preview} /> : null}
      {source === "mock" && !preview ? <SampleDataBanner noun="jobs" /> : null}
      {source === "error" && failure ? (
        <Banner tone="danger" title="Couldn't load Tonight" role="alert">
          {failure.message}
        </Banner>
      ) : null}

      <TonightHero
        run={run}
        draftCount={drafts.length}
        refusalCount={refusals === null ? null : refusals.length}
        onOpenHome={onOpenHome}
        onReviewDrafts={onReviewDrafts}
      />

      {/* The API reports no vault-notes count (the shortlist length is not one), so the row reads a dash. */}
      <PipelineOrganism run={run} vaultNotes={undefined} writerModel={writerModel} />

      <div className="tonight__lower">
        <NeedsYou
          drafts={drafts}
          busyId={busyId}
          onApprove={(job) => void decide(job, "approved")}
          onDeny={(job) => void decide(job, "skipped")}
        />
        <LastRunSummary
          run={run}
          funnel={{
            scouted: run?.scouted,
            shortlisted: run?.shortlisted,
            approved: undefined,
            applied: undefined,
          }}
          writer={{ mode: "cloud", cloudLabel: writerModel ?? undefined }}
          refusals={refusals}
        />
      </div>

      <Toast message={toast.message} onDismiss={toast.dismiss} />
    </div>
  );
}

/**
 * Purpose: Reach the landed empty / running / failed review states from a URL.
 * Does not: show in the default view — the Figma frames have no preview strip.
 */
function PreviewStrip({ active }: { active: string }) {
  return (
    <p className="tonight__preview">
      <span className="t-label">Preview state</span>
      <Link to={ROUTES.tonight}>live</Link>
      <Link to="/tonight?preview=empty" aria-current={active === "empty" ? "page" : undefined}>
        empty
      </Link>
      <Link
        to="/tonight?preview=running"
        aria-current={active === "running" ? "page" : undefined}
      >
        running
      </Link>
      <Link
        to="/tonight?preview=failed"
        aria-current={active === "failed" ? "page" : undefined}
      >
        failed
      </Link>
    </p>
  );
}
