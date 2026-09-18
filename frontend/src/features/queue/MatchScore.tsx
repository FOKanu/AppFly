import { formatScore } from "./filterJobs";
import styles from "./MatchScore.module.css";

type MatchScoreProps = {
  score: number | null;
};

/** Compact matcher score (0–100) with a small meter. */
export function MatchScore({ score }: MatchScoreProps) {
  const label = formatScore(score);
  const width = score == null ? 0 : Math.max(0, Math.min(100, Math.round(score * 100)));
  return (
    <div className={styles.score} data-testid="match-score" title={score == null ? "Unscored" : `Match ${label}`}>
      <span className={styles.value}>{label}</span>
      <span className={styles.meta}>match</span>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${width}%` }} />
      </span>
    </div>
  );
}
