import { useCallback, useEffect, useState } from "react";
import type { ApiFailure } from "../../shared/api/errors";
import { fetchTonight } from "./api";
import type { DataSource, PreviewState, TonightSnapshot } from "./types";

/**
 * Read ?preview=empty|running|failed for review states.
 */
export function readPreview(search: string): PreviewState | null {
  const value = new URLSearchParams(search).get("preview");
  if (value === "empty" || value === "running" || value === "failed") {
    return value;
  }
  return null;
}

/**
 * Load Tonight snapshot on mount, and again on reload() (after a run ends, D4).
 */
export function useTonight(): {
  snapshot: TonightSnapshot | null;
  source: DataSource | "error";
  failure: ApiFailure | null;
  loading: boolean;
  reload: () => void;
} {
  const [snapshot, setSnapshot] = useState<TonightSnapshot | null>(null);
  const [source, setSource] = useState<DataSource | "error">("mock");
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchTonight()
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
