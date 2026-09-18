import { sourceLabel } from "./filterJobs";
import styles from "./SourceBadge.module.css";

type SourceBadgeProps = {
  source: string;
};

/** Scout-channel stamp: Agentur API, Inbox, RSS, or Apify · Impressum only. */
export function SourceBadge({ source }: SourceBadgeProps) {
  const tone = source in styles ? styles[source as keyof typeof styles] : "";
  return (
    <span className={`${styles.badge} ${tone}`} data-testid="source-badge" data-source={source}>
      {sourceLabel(source)}
    </span>
  );
}
