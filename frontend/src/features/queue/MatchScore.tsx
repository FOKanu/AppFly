import { Score } from "../../shared/ui/Score";

type MatchScoreProps = {
  score: number | null;
  size?: "md" | "sm";
};

/**
 * Purpose: Matcher score on the 0–10 scale the Figma frames print.
 * Does not: compute the score; the local MiniLM matcher does.
 */
export function MatchScore({ score, size = "sm" }: MatchScoreProps) {
  return (
    <span
      data-testid="match-score"
      title={score == null ? "Unscored" : `Match ${toTen(score).toFixed(1)} of 10`}
    >
      <Score value={score == null ? null : toTen(score)} size={size} />
    </span>
  );
}

/** Matcher scores arrive as a 0–1 cosine; the UI prints 0–10. */
function toTen(score: number): number {
  return score <= 1 ? Math.round(score * 100) / 10 : score;
}
