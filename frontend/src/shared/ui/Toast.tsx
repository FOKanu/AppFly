import { useCallback, useEffect, useState } from "react";

/** How long a toast stays before dismissing itself. */
const LIFETIME_MS = 4000;

interface UseToastResult {
  message: string | null;
  show: (message: string) => void;
  dismiss: () => void;
}

/**
 * Purpose: One-at-a-time confirmation messages for actions that have no other
 *          visible result, so a control never looks like it did nothing.
 * Does not: queue messages — the newest replaces the current one.
 */
export function useToast(): UseToastResult {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((next: string) => setMessage(next), []);
  const dismiss = useCallback(() => setMessage(null), []);

  useEffect(() => {
    if (message === null) return;
    const timer = window.setTimeout(() => setMessage(null), LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return { message, show, dismiss };
}

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

/**
 * Purpose: Render the current toast above the running bar.
 * Does not: own the timer; `useToast` does.
 */
export function Toast({ message, onDismiss }: ToastProps) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__dot" aria-hidden="true" />
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__close" aria-label="Dismiss" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
