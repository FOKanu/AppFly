import { useCallback, useEffect, useState } from "react";
import type { ApiFailure } from "../../shared/api/errors";
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
 * Load Workflow data on mount, and again on reload() (after a run ends).
 */
export function useWorkflow(): {
  snapshot: WorkflowSnapshot | null;
  source: DataSource | "error";
  failure: ApiFailure | null;
  loading: boolean;
  reload: () => void;
} {
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null);
  const [source, setSource] = useState<DataSource | "error">("mock");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    // Review fixtures: ?preview=running|failed|rate_limited replaces the API snapshot (mock source).
    const preview = readPreview(window.location.search);
    const fixture = preview ? previewSnapshot(preview) : null;
    if (fixture) {
      setSnapshot(fixture);
      setSource("mock");
      setFailure(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchWorkflow()
      .then((result) => {
        if (cancelled) return;
        if (result.source === "error") {
          setSnapshot(null);
          setSource("error");
          setFailure(result.failure);
          return;
        }
        setSnapshot(result.data);
        setSource(result.source);
        setFailure(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return { snapshot, source, failure, loading, reload };
}
