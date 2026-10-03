import { Button } from "../../shared/ui/Button";
import type { JobRecord, JobStatus } from "../queue/types";

interface ApproveStripProps {
  job: JobRecord;
  busy: boolean;
  feedback: string | null;
  onStatus: (status: JobStatus) => void;
}

/**
 * Purpose: The approval footer — states exactly what approving writes, then
 *          offers Deny / Approve packet.
 * Does not: submit the application. The person applies in their own browser.
 */
export function ApproveStrip({ job, busy, feedback, onStatus }: ApproveStripProps) {
  return (
    <section className="approve-strip" data-testid="packet-actions">
      <span className="approve-strip__dot" aria-hidden="true" />
      <div className="approve-strip__col">
        <p className="approve-strip__copy">
          Approving marks the packet approved in your local AppFly store. You still submit it
          yourself in the browser.
        </p>
        {feedback ? (
          <p className="approve-strip__feedback" data-testid="packet-feedback">
            {feedback}
          </p>
        ) : null}
      </div>

      <Button
        variant="quiet"
        shortcut="D"
        disabled={busy || job.status === "applied"}
        onClick={() => onStatus("skipped")}
      >
        Deny
      </Button>
      <Button
        variant="approve"
        shortcut="A"
        disabled={busy || job.status === "applied"}
        onClick={() => onStatus("approved")}
      >
        Approve packet
      </Button>
    </section>
  );
}
