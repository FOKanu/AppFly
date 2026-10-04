/**
 * Purpose: Strip API keys, bearer tokens, and secret JSON fields from log text.
 * Does not: parse run success, fetch logs, or keep the original secret.
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let redacted = text;
  const patterns: RegExp[] = [
    /\bAIza[0-9A-Za-z\-_]{20,}\b/g,
    /\bsk-[A-Za-z0-9]{16,}\b/g,
    /Bearer\s+[A-Za-z0-9._\-+=/]+/gi,
    /\b(GEMINI_API_KEY|JOBSUCHE_API_KEY|APIFY_(?:TOKEN|API_KEY)|OPENAI_API_KEY)\b\s*[=:]\s*\S+/gi,
    /\b(api[_-]?key|access[_-]?token|secret|password)\b\s*[=:]\s*['"]?[^'"\s]+/gi,
    /"(?:[^"]*(?:api[_-]?key|access[_-]?token|secret|password)[^"]*)"\s*:\s*"[^"]*"/gi,
    /x-api-key\s*[:=]\s*\S+/gi,
  ];
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, "[redacted]");
  }
  return redacted;
}

/**
 * Purpose: Turn mixed error payloads into redacted display strings.
 * Does not: show raw JSON if it still contains key material.
 */
export function redactError(error: unknown): string {
  if (typeof error === "string") return redactSecrets(error);
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.detail;
    if (typeof message === "string") return redactSecrets(message);
    try {
      return redactSecrets(JSON.stringify(error));
    } catch {
      return "[redacted]";
    }
  }
  return redactSecrets(String(error));
}
