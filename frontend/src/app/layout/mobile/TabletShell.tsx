import type { ReactNode } from "react";
import { OfflineBanner } from "../../../shared/ui/OfflineBanner";
import { NavGlyph } from "./BottomNav";
import { MoreMenu } from "./MoreMenu";
import {
  PRIMARY_NAV,
  isMoreRoute,
  titleForRoute,
  type PrimaryNavId,
  type ShellRoute,
} from "./nav";
import styles from "./TabletShell.module.css";

/** Props for {@link TabletShell}. */
export type TabletShellProps = {
  route: ShellRoute;
  moreOpen: boolean;
  aside: ReactNode;
  onNavigate: (id: PrimaryNavId) => void;
  onSelectRoute: (route: ShellRoute) => void;
  onCloseMore: () => void;
  children: ReactNode;
};

/**
 * FigJam 03 Tablet (768): icon rail, two-pane content, More as a flyout panel.
 */
export function TabletShell({
  route,
  moreOpen,
  aside,
  onNavigate,
  onSelectRoute,
  onCloseMore,
  children,
}: TabletShellProps) {
  return (
    <div className={styles.shell} data-layout="tablet">
      <nav className={styles.rail} aria-label="Primary">
        <p className={styles.mark}>JH</p>
        {PRIMARY_NAV.map((item) => {
          const selected =
            item.id === "more" ? moreOpen || isMoreRoute(route) : route === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={selected ? `${styles.railBtn} ${styles.selected}` : styles.railBtn}
              aria-current={selected ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <NavGlyph id={item.id} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.body}>
        <header className={styles.top}>
          <div>
            <p className={styles.brand}>Jobhunt Copilot</p>
            <h1>{titleForRoute(route)}</h1>
          </div>
          <p className={styles.chip}>Human submit · sealed packets</p>
        </header>
        <div className={styles.banners}>
          <OfflineBanner />
        </div>
        <div className={styles.panes}>
          <main className={styles.main}>{children}</main>
          <aside className={styles.aside}>{aside}</aside>
        </div>
      </div>
      <MoreMenu
        open={moreOpen}
        route={route}
        variant="panel"
        onClose={onCloseMore}
        onSelect={onSelectRoute}
      />
    </div>
  );
}
