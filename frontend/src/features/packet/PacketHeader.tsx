import { MatchScore } from "../queue/MatchScore";
import { SourceBadge } from "../queue/SourceBadge";
import { StatusChip } from "../queue/StatusChip";
import type { JobRecord } from "../queue/types";
import styles from "./PacketHeader.module.css";

type PacketHeaderProps = {
  job: JobRecord;
};

/** Header for a sealed writer packet: one job, not the vault. */
export function PacketHeader({ job }: PacketHeaderProps) {
  return (
    <header className={styles.header} data-testid="packet-header">
      <div className={styles.sealRow}>
        <span className={styles.seal} aria-hidden="true">
          Sealed
        </span>
        <StatusChip status={job.status} />
        <SourceBadge source={job.source} />
        <div className={styles.score}>
          <MatchScore score={job.score} />
        </div>
      </div>
      <h1 className={styles.title}>{job.title}</h1>
      <p className={styles.sub}>
        {job.company}
        {job.location ? ` · ${job.location}` : ""}
        {job.salary ? ` · ${job.salary}` : ""}
      </p>
      <p className={styles.note}>
        This packet is one job plus a letter excerpt. CV, voice samples, and other jobs stay out.
      </p>
    </header>
  );
}
