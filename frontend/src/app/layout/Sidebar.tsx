import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../nav-config";
import appflyMark from "../brand/appfly-mark.png";
import type { LinkHealth, SystemStatusResponse } from "../../shared/api/client";
import type { HuntProfile } from "../../features/profiles/types";
import { ProfileMenu } from "./ProfileMenu";

interface SidebarProps {
  queueCount: number;
  /** Every search preset the API knows about. */
  profiles: HuntProfile[];
  activeProfileId: string | null;
  onActivateProfile: (id: string) => void;
  onCopyVaultPath: () => void;
  status: SystemStatusResponse;
  /** App version shown under the brand name. */
  version: string;
}

/**
 * Purpose: Primary rail — brand, profile switcher, numbered nav 01–06 and the
 *          system-status card (desktop), plus the mobile bottom bar.
 * Does not: load queue rows, reveal connector keys, or open the vault.
 */
export function Sidebar({
  queueCount,
  profiles,
  activeProfileId,
  onActivateProfile,
  onCopyVaultPath,
  status,
  version,
}: SidebarProps) {
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar__brand">
          <img className="sidebar__mark" src={appflyMark} alt="" width={24} height={24} />
          <div>
            <p className="sidebar__name">Jobhunt Copilot</p>
            <p className="sidebar__meta">local · v{version}</p>
          </div>
        </div>

        <ProfileMenu
          profiles={profiles}
          activeId={activeProfileId}
          onActivate={onActivateProfile}
          onCopyVaultPath={onCopyVaultPath}
        />

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                ["nav-link", isActive ? "is-active" : ""].filter(Boolean).join(" ")
              }
            >
              <span className="nav-link__index">{item.index}</span>
              <span className="nav-link__label">{item.label}</span>
              {item.showCount ? (
                <span className="nav-link__count">{queueCount}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__status">
          <StatusRow label="Local IPC" health={status.ipc} value={ipcValue(status.ipc)} />
          <StatusRow label="Ollama" health={status.ollama} value={status.ollamaDetail} />
          <StatusRow label="Gemini" health={status.gemini} value={status.geminiDetail} />
          <p className="sidebar__status-path" title={status.vaultPath}>
            {status.vaultPath || "—"}
          </p>
        </div>
      </aside>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={`m-${item.id}`}
            to={item.path}
            className={({ isActive }) =>
              ["bottom-nav__link", isActive ? "is-active" : ""].filter(Boolean).join(" ")
            }
          >
            <span className="bottom-nav__index">{item.index}</span>
            <span className="bottom-nav__label">
              {item.label.split(" ")[0]}
              {item.showCount ? <span className="bottom-nav__count">{queueCount}</span> : null}
            </span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

function StatusRow({
  label,
  health,
  value,
}: {
  label: string;
  health: LinkHealth;
  value?: string;
}) {
  return (
    <p className="sidebar__status-row" data-health={healthTone(health)}>
      <span className="sidebar__status-dot" aria-hidden="true" />
      <span>{label}</span>
      <span className="sidebar__status-value">{value ?? health}</span>
    </p>
  );
}

/**
 * Purpose: Map link health onto the three dot colours the Figma card uses.
 * Does not: ping the services; AppShell owns the probe.
 */
function healthTone(health: LinkHealth): "ok" | "warn" | "down" | "idle" {
  if (health === "ok") return "ok";
  if (health === "down") return "down";
  return "idle";
}

function ipcValue(health: LinkHealth): string {
  if (health === "ok") return "connected";
  if (health === "down") return "offline";
  return "unknown";
}
