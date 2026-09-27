import { useEffect, useState } from "react";
import { Banner } from "./Banner";
import { apiBaseUrl } from "../api/client";
import styles from "./OfflineBanner.module.css";

/**
 * Connectivity the UI can show without talking to job boards.
 * Local IPC is the Mac `jobhunt` process. Remote Bridge is a user-owned
 * link to that process. Neither path may scrape deny-listed hosts.
 */
export type CopilotConnectivity = {
  browserOnline: boolean;
  localIpc: "connected" | "disconnected";
  remoteBridge: "connected" | "disconnected";
};

/** Optional overrides for tests and FigJam 05 previews. */
export type OfflineBannerProps = {
  connectivity?: Partial<CopilotConnectivity>;
};

const DEFAULT_CONNECTIVITY: CopilotConnectivity = {
  browserOnline: true,
  localIpc: "disconnected",
  // Phase 1 is local-only; hide the Remote Bridge strip unless a caller opts in.
  remoteBridge: "connected",
};

/**
 * Stack Offline / Local IPC / Remote Bridge banners (FigJam 05 States).
 * Defaults Local IPC to disconnected until the shell reports otherwise.
 * Remote Bridge stays hidden in Phase 1 unless a caller passes disconnected.
 */
export function OfflineBanner({ connectivity }: OfflineBannerProps) {
  const live = useNavigatorOnline();
  const status: CopilotConnectivity = {
    ...DEFAULT_CONNECTIVITY,
    browserOnline: live,
    ...connectivity,
  };

  const banners = [
    !status.browserOnline ? (
      <Banner key="offline" tone="danger" title="You’re offline" role="alert">
        Scout and the letter writer need a network. Your files on this machine are unaffected. Nothing is submitted automatically.
      </Banner>
    ) : null,
    status.localIpc === "disconnected" ? (
      <Banner key="ipc" tone="warning" title="Local IPC disconnected">
        {`This page can't reach the local API at ${apiBaseUrl()}. Start it with python -m jobhunt.api. Never paste job-board cookies to work around this.`}
      </Banner>
    ) : null,
    status.remoteBridge === "disconnected" ? (
      <Banner key="bridge" tone="info" title="Remote Bridge disconnected">
        Phone or tablet is not linked to the home machine. There is no remote
        apply and no job-board session sharing.
      </Banner>
    ) : null,
  ].filter(Boolean);

  if (banners.length === 0) return null;

  return <div className={styles.stack}>{banners}</div>;
}

/**
 * Browser online/offline flag from `navigator.onLine`.
 */
export function useNavigatorOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
