import type { ReactNode } from "react";
import styles from "./Banner.module.css";

/** Visual tone for a non-blocking status strip. */
export type BannerTone = "info" | "warning" | "danger" | "neutral";

/** Props for {@link Banner}. */
export type BannerProps = {
  tone?: BannerTone;
  title: string;
  children?: ReactNode;
  role?: "status" | "alert";
};

/**
 * Compact status strip used by connectivity and run-edge states.
 * Does not include actions that would scrape job boards or Easy Apply.
 */
export function Banner({
  tone = "neutral",
  title,
  children,
  role = "status",
}: BannerProps) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={role}>
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.body}>{children}</div> : null}
    </div>
  );
}
