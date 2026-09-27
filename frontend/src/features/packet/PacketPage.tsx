import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost, apiPut } from "../../shared/api/client";
import { describeApiError, type ApiFailure } from "../../shared/api/errors";
import { Banner } from "../../shared/ui/Banner";
import { SampleDataBanner } from "../../shared/ui/SampleDataBanner";
import { getJob, patchJobStatus } from "../queue/jobsApi";
import type { JobRecord, JobStatus } from "../queue/types";
import { ApproveStrip } from "./ApproveStrip";
import { CvTweaks } from "./CvTweaks";
import { LetterWorkbench } from "./LetterWorkbench";
import { PacketSpec } from "./PacketSpec";
import "./packet.css";

function asFailure(err: unknown): ApiFailure | null {
  if (err && typeof err === "object" && "kind" in err && "message" in err) {
    return err as ApiFailure;
  }
  return null;
}

/** 404 sentence for save and regenerate (UI spec, W1 follow-up). */
const JOB_GONE = "This job is no longer in the store. Go back to Queue and refresh.";

/**
 * Purpose: Sealed writer packet — one job, its letter, and the approval step.
 * Does not: load the rest of the vault, render the CV body, or submit anything.
 */
export function PacketPage() {
  const { sourceId = "" } = useParams();
  const decodedId = decodeURIComponent(sourceId);
  const [job, setJob] = useState<JobRecord | null>(null);
  const [letterBody, setLetterBody] = useState("");
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
      .then(async (result) => {
        if (cancelled) return;
        setJob(result.job);
        setUsingMock(result.usingMock);
        const extended = result.job as JobRecord & { letter_body?: string };
        setLetterBody(extended.letter_body || result.job.letter_excerpt || "");
        if (!result.usingMock) {
          try {
            const data = await apiGet<{ body?: string }>(
              `/jobs/${encodeURIComponent(decodedId)}/letter`,
            );
            if (!cancelled && data.body) setLetterBody(data.body);
          } catch {
            /* keep excerpt — letter endpoint may 404 */
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const failure = asFailure(err);
          setError(failure?.message ?? (err instanceof Error ? err.message : "Failed to load packet"));
        }
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
      setError(null);
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

  const onSave = useCallback(
    async (text: string) => {
      if (!job || usingMock) {
        setFeedback("Saved in this session only (API offline).");
        return;
      }
      setBusy(true);
      setError(null);
      setFeedback(null);
      try {
        await apiPut<unknown>(`/jobs/${encodeURIComponent(job.source_id)}/letter`, { body: text });
        setLetterBody(text);
        setFeedback("Letter saved to the local store.");
      } catch (err: unknown) {
        const failure = describeApiError(err, "Saving the letter", JOB_GONE);
        if (!failure.aborted) setError(failure.message);
      } finally {
        setBusy(false);
      }
    },
    [job, usingMock],
  );

  const onRegenerate = useCallback(async () => {
    if (!job || usingMock) {
      setFeedback("Regenerate needs the local API.");
      return;
    }
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const data = await apiPost<{ body?: string }>(
        `/jobs/${encodeURIComponent(job.source_id)}/letter/regenerate`,
      );
      if (data?.body) setLetterBody(data.body);
      setFeedback("Letter regenerated.");
    } catch (err: unknown) {
      const failure = describeApiError(err, "Regenerating the letter", JOB_GONE);
      if (!failure.aborted) setError(failure.message);
    } finally {
      setBusy(false);
    }
  }, [job, usingMock]);

  return (
    <section className="packet-page page-flush" data-testid="packet-page">
      {usingMock ? <SampleDataBanner noun="jobs" /> : null}
      {error ? (
        <div data-testid="packet-error">
          <Banner tone="danger" title="Couldn't load Packet" role="alert">
            {error}
          </Banner>
        </div>
      ) : null}

      {job ? (
        <div className="packet-page__panes">
          <PacketSpec job={job} />

          <div className="packet-page__work">
            <LetterWorkbench
              aiDraft={letterBody || job.letter_excerpt}
              writer={job.source === "agentur" ? "gemini-3.8-flash" : undefined}
              onSave={(text) => void onSave(text)}
              onRegenerate={() => void onRegenerate()}
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
