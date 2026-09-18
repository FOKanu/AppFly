import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJob, patchJobStatus } from "../queue/jobsApi";
import type { JobRecord, JobStatus } from "../queue/types";
import { LetterPanel } from "./LetterPanel";
import { PacketActions } from "./PacketActions";
import { PacketHeader } from "./PacketHeader";
import styles from "./PacketPage.module.css";

/**
 * Sealed writer packet: one job + letter excerpt, approve / skip via PATCH.
 * Does not load the rest of the vault.
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

  async function onStatus(status: JobStatus) {
    if (!job) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updated = await patchJobStatus(job.source_id, status);
      setJob({ ...job, ...updated, letter_excerpt: job.letter_excerpt, description: job.description });
      setFeedback(status === "approved" ? "Marked approved. Submit it yourself." : "Marked skipped.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "PATCH failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.page} data-testid="packet-page">
      <Link className={styles.back} to={job ? `/queue/${encodeURIComponent(job.source_id)}` : "/queue"}>
        ← Queue
      </Link>
      {usingMock ? (
        <p className={styles.banner} data-testid="mock-banner">
          Sample packet — GET /jobs/{"{id}"} is unavailable.
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} data-testid="packet-error">
          {error}
        </p>
      ) : null}
      {job ? (
        <div className={styles.layout}>
          <PacketActions
            job={job}
            busy={busy}
            feedback={feedback}
            onStatus={(status) => void onStatus(status)}
            onFeedback={setFeedback}
          />
          <div className={styles.main}>
            <PacketHeader job={job} />
            <LetterPanel excerpt={job.letter_excerpt} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
