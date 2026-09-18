import { useEffect, useState } from "react";
import { fetchWorkflow } from "./api";
import type { DataSource, PreviewState, WorkflowSnapshot } from "./types";
import { MOCK_FAILED, MOCK_RATE_LIMITED, MOCK_RUNNING } from "./mock";

/**
 * Read Workflow preview query param.
 */
export function readPreview(search: string): PreviewState | null {
  const value = new URLSearchParams(search).get("preview");
  if (
    value === "empty" ||
    value === "running" ||
    value === "failed" ||
    value === "rate_limited"
  ) {
    return value;
  }
  return null;
}

/**
 * Snapshot for a forced preview state (review / FigJam states).
 */
export function previewSnapshot(preview: PreviewState): WorkflowSnapshot | null {
  if (preview === "running") return MOCK_RUNNING;
  if (preview === "failed") return MOCK_FAILED;
  if (preview === "rate_limited") return MOCK_RATE_LIMITED;
  return null;
}

/**
 * Load Workflow data once on mount.
 */
export function useWorkflow(): {
  snapshot: WorkflowSnapshot | null;
  source: DataSource;
  loading: boolean;
} {
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchWorkflow()
      .then((result) => {
        if (cancelled) return;
        setSnapshot(result.data);
        setSource(result.source);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { snapshot, source, loading };
}
