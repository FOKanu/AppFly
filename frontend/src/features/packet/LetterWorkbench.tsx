import { useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Segmented } from "../../shared/ui/Segmented";

/** How the letter editor presents the AI draft against your edit. */
type LetterMode = "ai" | "yours" | "inline" | "split";

const MODES = [
  { value: "ai", label: "AI draft" },
  { value: "yours", label: "Your edit" },
  { value: "inline", label: "Inline diff" },
  { value: "split", label: "Split diff" },
] as const;

const LANGUAGES = [
  { value: "EN", label: "EN" },
  { value: "DE", label: "DE" },
] as const;

interface LetterWorkbenchProps {
  /** Letter the writer produced. */
  aiDraft: string;
  /** Model that produced it, e.g. "gemini-3.8-flash". */
  writer?: string;
  /** Your edited version, when one has been saved. */
  yourEdit?: string;
  onSave: (text: string) => void;
  onRegenerate: () => void;
  /** True while a save or regenerate is in flight; disables both buttons. */
  busy?: boolean;
}

/** Why the write controls were inert before letter PUT landed. */
const SAVE_HINT = "Saves to the local AppFly store (native SQLite or markdown vault).";

/**
 * Purpose: Letter editor — the AI draft beside your edit, with the mode,
 *          language and save controls from the Figma packet frame.
 * Does not: submit the application.
 */
export function LetterWorkbench({
  aiDraft,
  writer,
  yourEdit,
  onSave,
  onRegenerate,
  busy = false,
}: LetterWorkbenchProps) {
  const [mode, setMode] = useState<LetterMode>("split");
  const [language, setLanguage] = useState<"EN" | "DE">("EN");
  const [text, setText] = useState(yourEdit ?? aiDraft);

  useEffect(() => {
    setText(yourEdit ?? aiDraft);
  }, [aiDraft, yourEdit]);

  const aiLines = lines(aiDraft);
  const yourLines = lines(text);
  const added = yourLines.filter((line) => !aiLines.includes(line)).length;
  const removed = aiLines.filter((line) => !yourLines.includes(line)).length;

  return (
    <section className="letter" data-testid="letter-panel">
      <header className="letter__toolbar">
        <h2 className="letter__title">Application letter</h2>
        <Segmented options={MODES} value={mode} onChange={setMode} ariaLabel="Letter view" />
        <Segmented
          options={LANGUAGES}
          value={language}
          onChange={setLanguage}
          ariaLabel="Letter language"
          disabled
          disabledReason="The writer produces one language per letter; switching needs a re-run the API does not expose."
        />
        <span className="letter__rule" />
        <button
          type="button"
          className="letter__icon-button"
          aria-label="Regenerate letter"
          title="Regenerate with Gemini"
          onClick={onRegenerate}
          disabled={busy}
        >
          ↻
        </button>
        <span className="letter__diffcount">
          <span className="letter__added">+{added}</span>{" "}
          <span className="letter__removed">−{removed}</span>
        </span>
        <Button variant="primary" shortcut="⌘S" title={SAVE_HINT} disabled={busy} onClick={() => onSave(text)}>
          Save letter
        </Button>
      </header>

      <div className="letter__panes" data-mode={mode}>
        {mode !== "yours" ? (
          <article className="letter-pane">
            <header className="letter-pane__head">
              <span className="letter-pane__dot" data-tone="ai" aria-hidden="true" />
              AI draft
              <span className="letter__rule" />
              <span className="letter-pane__meta">
                {writer ?? "—"} · {words(aiDraft)} w
              </span>
            </header>
            <div className="letter-pane__body">
              {aiLines.length > 0 ? (
                aiLines.map((line, index) => (
                  <p
                    key={`${index}-${line.slice(0, 12)}`}
                    className="letter-line"
                    data-diff={yourLines.includes(line) ? undefined : "removed"}
                  >
                    {line}
                  </p>
                ))
              ) : (
                <p className="letter-pane__empty">
                  No letter yet. The writer has not sealed a packet for this job.
                </p>
              )}
            </div>
          </article>
        ) : null}

        {mode !== "ai" ? (
          <article className="letter-pane">
            <header className="letter-pane__head">
              <span className="letter-pane__dot" data-tone="yours" aria-hidden="true" />
              Your edit
              <span className="letter__rule" />
              <span className="letter-pane__meta">editing · {words(text)} w</span>
            </header>
            <textarea
              className="letter-pane__editor"
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="Your edit of the application letter"
              spellCheck
              placeholder="No letter drafted yet."
            />
          </article>
        ) : null}
      </div>

      <p className="letter__note">{SAVE_HINT}</p>
    </section>
  );
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
