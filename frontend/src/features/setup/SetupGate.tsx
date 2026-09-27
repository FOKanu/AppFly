import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { getWorkspace } from "../vault/api";
import {
  SETUP_DISMISSED_KEY,
  SETUP_GATE_POLL_MS,
  SETUP_GATE_RETRY_MS,
} from "./constants";

/**
 * Purpose: On boot, send incomplete workspaces to `/setup` (M6).
 * Inputs: Children under BrowserRouter; `GET /workspace/status`.
 * Returns: Children unchanged after the gate settles.
 * Does not: Redirect when the API is down, or when the user dismissed setup.
 */
export function SetupGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (location.pathname === ROUTES.setup) {
      setReady(true);
      return;
    }

    if (typeof localStorage !== "undefined" && localStorage.getItem(SETUP_DISMISSED_KEY) === "1") {
      setReady(true);
      return;
    }

    let cancelled = false;

    async function probe(): Promise<boolean> {
      const deadline = Date.now() + SETUP_GATE_RETRY_MS;
      while (!cancelled && Date.now() <= deadline) {
        try {
          const status = await getWorkspace();
          if (!status.has_gemini || !status.has_cv) {
            navigate(ROUTES.setup, { replace: true });
          }
          return true;
        } catch {
          await new Promise((r) => setTimeout(r, SETUP_GATE_POLL_MS));
        }
      }
      // Persistent failure: stay on current route (desktop API may still be starting).
      return false;
    }

    void probe().finally(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (!ready && location.pathname !== ROUTES.setup) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--surface-0, #0B0D10)",
          color: "var(--text-secondary, #A1AAB6)",
          fontSize: 14,
        }}
      >
        Checking your setup…
      </div>
    );
  }

  return <>{children}</>;
}
