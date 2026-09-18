import styles from "./LetterPanel.module.css";

type LetterPanelProps = {
  excerpt: string;
};

/** Cover-letter excerpt for the sealed packet (not the whole Letters/ folder). */
export function LetterPanel({ excerpt }: LetterPanelProps) {
  return (
    <section className={styles.panel} data-testid="letter-panel">
      <p className={styles.kicker}>Letter excerpt</p>
      {excerpt.trim() ? (
        <pre className={styles.body}>{excerpt}</pre>
      ) : (
        <p className={`${styles.body} ${styles.empty}`}>
          No letter yet. The writer has not sealed a packet for this job.
        </p>
      )}
    </section>
  );
}
