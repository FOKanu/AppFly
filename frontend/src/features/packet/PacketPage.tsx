import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getJob, patchJobStatus, requestListingFetch } from "../queue/jobsApi";
import type { JobRecord, JobStatus } from "../queue/types";
import { ApproveStrip } from "./ApproveStrip";
import { CvTweaks } from "./CvTweaks";
import { LetterWorkbench } from "./LetterWorkbench";
import { PacketSpec } from "./PacketSpec";
import "./packet.css";

/**
 * Purpose: Sealed writer packet — one job, its letter, and the approval step.
 * Does not: load the rest of the vault, render the CV body, or submit anything.
 */
export function PacketPage() {
  const { sourceId = "" } = useParams();
  const decodedId = decodeURIComponent(sourceId);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setJob(null);
    setError(null);
    setFeedback(null);
    if (!decodedId) {
      setError("Missing job id");
      return () => {
        cancelled = true;
      };
    }
    getJob(decodedId)
      .then((result) => {
        if (cancelled) return;
        setJob(result.job);
        setUsingMock(result.usingMock);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load packet");
      });
    return () => {
      cancelled = true;
    };
  }, [decodedId]);

  const onStatus = useCallback(
    async (status: JobStatus) => {
      if (!job) return;
      setBusy(true);
      setFeedback(null);
      try {
        const updated = await patchJobStatus(job.source_id, status);
        setJob({
          ...job,
          ...updated,
          letter_excerpt: job.letter_excerpt,
          description: job.description,
        });
        setFeedback(
          status === "approved" ? "Marked approved. Submit it yourself." : "Marked skipped.",
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "PATCH failed");
      } finally {
        setBusy(false);
      }
    },
    [job],
  );

  const onFetchListing = useCallback(async () => {
    if (!job) return;
    const result = await requestListingFetch(job.source_id, job.crawl_allowed);
    setFeedback(result.message);
  }, [job]);

  return (
    <section className="packet-page page-flush" data-testid="packet-page">
      {usingMock ? (
        <p className="packet-page__banner" data-testid="mock-banner">
          Sample packet — GET /jobs/{"{id}"} is unavailable.
        </p>
      ) : null}
      {error ? (
        <p className="packet-page__banner" data-testid="packet-error">
          {error}
        </p>
      ) : null}

      {job ? (
        <div className="packet-page__panes">
          <PacketSpec job={job} onFetchListing={() => void onFetchListing()} />

          <div className="packet-page__work">
            <LetterWorkbench
              aiDraft={job.letter_excerpt}
              writer={job.source === "agentur" ? "gemini-2.5-flash" : undefined}
              onSave={() => undefined}
              onRegenerate={() => undefined}
            />
            <CvTweaks tweaks={[]} />
            <ApproveStrip
              job={job}
              busy={busy}
              feedback={feedback}
              onStatus={(status) => void onStatus(status)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
