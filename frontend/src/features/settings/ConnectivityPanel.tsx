import { useEffect, useState } from "react";
import { formatStatus } from "./settingsApi";
import type { ConnectivityView } from "./types";

export type ConnectivityPanelProps = {
  connectivity: ConnectivityView;
};

/**
 * Local IPC reachability plus Phase-2 Remote Bridge stub.
 * Does not start a bridge server. Connect stays disabled.
 */
export function ConnectivityPanel({ connectivity }: ConnectivityPanelProps) {
  const [url, setUrl] = useState(connectivity.remoteBridge.url);

  useEffect(() => {
    setUrl(connectivity.remoteBridge.url);
  }, [connectivity.remoteBridge.url]);

  const bridgeStatus = connectivity.remoteBridge.status;
  const bridgeLabel =
    bridgeStatus === "not_configured" || !url.trim() ? "not configured" : "offline";

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">Local IPC vs Remote Bridge</p>
      <h2 className="settings-card__title">Connectivity</h2>
      <div className="connectivityRow">
        <div>
          <h3>Local IPC</h3>
          <p className="settingsHint">macOS · jobhunt CLI ↔ app</p>
        </div>
        <span
          className={
            connectivity.localIpc.status === "online"
              ? "statusPill statusPill--ok"
              : "statusPill statusPill--offline"
          }
          role="status"
        >
          {formatStatus(connectivity.localIpc.status)}
        </span>
      </div>
      <div className="connectivityBlock">
        <div className="connectivityRow">
          <div>
            <h3>Remote Bridge API</h3>
            <p className="settingsHint">mobile / Android · REST + WebSocket</p>
          </div>
          <span className="statusPill statusPill--missing" role="status">
            {bridgeLabel}
          </span>
        </div>
        <p className="settingsHint">
          not configured — required for phone access to a headless runner
        </p>
        <label htmlFor="bridge-url">Bridge URL</label>
        <div className="settingsActions">
          <input
            id="bridge-url"
            name="bridge-url"
            type="url"
            autoComplete="off"
            placeholder="https://bridge.example.invalid"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button type="button" disabled title="Remote Bridge is Phase 2">
            Connect
          </button>
        </div>
      </div>
      <p className="settings-card__copy">
        Phase 2: the Bridge API lets an Android client reach this same pipeline running on a
        home server or cloud runner, without exposing the vault directly.
      </p>
    </article>
  );
}
