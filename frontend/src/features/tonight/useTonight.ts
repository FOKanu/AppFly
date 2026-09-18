import { useEffect, useState } from "react";
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
 * Load Tonight snapshot once on mount.
 */
export function useTonight(): {
  snapshot: TonightSnapshot | null;
  source: DataSource;
  loading: boolean;
} {
  const [snapshot, setSnapshot] = useState<TonightSnapshot | null>(null);
  const [source, setSource] = useState<DataSource>("mock");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTonight()
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
