import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiBaseUrl, APPFLY_HEADERS } from "../../shared/api/client";
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
            const res = await fetch(
              new URL(`/jobs/${encodeURIComponent(decodedId)}/letter`, apiBaseUrl()),
            );
            if (res.ok) {
              const data = (await res.json()) as { body?: string };
              if (!cancelled && data.body) setLetterBody(data.body);
            }
          } catch {
            /* keep excerpt */
          }
        }
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

  const onSave = useCallback(
    async (text: string) => {
      if (!job || usingMock) {
        setFeedback("Saved in this session only (API offline).");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(
          new URL(`/jobs/${encodeURIComponent(job.source_id)}/letter`, apiBaseUrl()),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...APPFLY_HEADERS },
            body: JSON.stringify({ body: text }),
          },
        );
        if (!res.ok) throw new Error(await res.text());
        setLetterBody(text);
        setFeedback("Letter saved to the local store.");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Save failed");
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
    try {
      const res = await fetch(
        new URL(`/jobs/${encodeURIComponent(job.source_id)}/letter/regenerate`, apiBaseUrl()),
        { method: "POST", headers: { ...APPFLY_HEADERS } },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { body?: string };
      if (data.body) setLetterBody(data.body);
      setFeedback("Letter regenerated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }, [job, usingMock]);

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
              aiDraft={letterBody || job.letter_excerpt}
              writer={job.source === "agentur" ? "gemini-2.5-flash" : undefined}
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
