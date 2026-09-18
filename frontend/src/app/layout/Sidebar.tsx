import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../nav-config";
import { Chip } from "../../shared/ui/Chip";

interface SidebarProps {
  queueCount: number;
}

/**
 * Purpose: Primary numbered nav (desktop rail + mobile bottom bar).
 * Does not: load queue rows or tonight briefing content.
 */
export function Sidebar({ queueCount }: SidebarProps) {
  return (
    <>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar__brand">
          <span className="sidebar__mark" aria-hidden="true" />
          <div>
            <p className="sidebar__kicker">Local copilot</p>
            <p className="sidebar__title">Jobhunt</p>
          </div>
        </div>
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
                <Chip className="nav-link__count" tone="muted">
                  {queueCount}
                </Chip>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <p className="sidebar__policy">
          Crawl deny-list is on. No LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, or
          Glassdoor scrape.
        </p>
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
              {item.showCount ? (
                <span className="bottom-nav__count">{queueCount}</span>
              ) : null}
            </span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
