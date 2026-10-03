/**
 * Purpose: One display name for the letter writer model across screens.
 * Does not: guess a model; unknown or empty shows UNKNOWN_WRITER.
 */
export const UNKNOWN_WRITER = "Gemini (model unknown)";

/** Purpose: Trimmed model id, or UNKNOWN_WRITER when missing. */
export function writerLabel(model?: string | null): string {
  const trimmed = model?.trim();
  return trimmed ? trimmed : UNKNOWN_WRITER;
}
