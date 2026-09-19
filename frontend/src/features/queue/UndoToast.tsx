import { useEffect, useState } from "react";
import type { JobStatus } from "./types";

/** One reversible status change. */
export interface UndoEntry {
  sourceId: string;
  title: string;
  status: JobStatus;
  previous: JobStatus;
}

interface UndoToastProps {
  entry: UndoEntry | null;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Every status change stays reversible for this long. */
const WINDOW_SECONDS = 5;

/**
 * Purpose: "Everything is reversible" — a 5-second undo window after a status change.
 * Does not: retry the API call; QueuePage owns both the change and the undo.
 */
export function UndoToast({ entry, onUndo, onDismiss }: UndoToastProps) {
  const [left, setLeft] = useState(WINDOW_SECONDS);

  useEffect(() => {
    if (!entry) return;
    setLeft(WINDOW_SECONDS);
    const tick = window.setInterval(() => setLeft((value) => value - 1), 1000);
    const close = window.setTimeout(onDismiss, WINDOW_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(close);
    };
  }, [entry, onDismiss]);

  if (!entry) return null;

  return (
    <div className="undo-toast" role="status" aria-live="polite">
      <span className="undo-toast__dot" aria-hidden="true" />
      <span className="undo-toast__label">
        {entry.title} → {entry.status}
      </span>
      <span className="undo-toast__timer">{Math.max(0, left)}s</span>
      <button type="button" className="undo-toast__action" onClick={onUndo}>
        Undo <kbd className="kbd">⌘Z</kbd>
      </button>
      <span
        className="undo-toast__progress"
        style={{ animationDuration: `${WINDOW_SECONDS}s` }}
        aria-hidden="true"
      />
    </div>
  );
}
