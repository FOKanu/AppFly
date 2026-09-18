import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

/** Props for {@link EmptyState}. */
export type EmptyStateProps = {
  kicker?: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
};

/**
 * Centered placeholder for empty lists and blocked writer states.
 * Keep CTAs to vault / local run actions — never Easy Apply.
 */
export function EmptyState({ kicker, title, children, icon }: EmptyStateProps) {
  return (
    <section className={styles.wrap} aria-live="polite">
      {icon ? <div className={styles.icon}>{icon}</div> : null}
      {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
