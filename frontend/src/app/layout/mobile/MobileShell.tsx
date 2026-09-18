import type { ReactNode } from "react";
import { OfflineBanner } from "../../../shared/ui/OfflineBanner";
import { BottomNav } from "./BottomNav";
import { MoreMenu } from "./MoreMenu";
import { titleForRoute, type PrimaryNavId, type ShellRoute } from "./nav";
import styles from "./MobileShell.module.css";

/** Props for {@link MobileShell}. */
export type MobileShellProps = {
  route: ShellRoute;
  moreOpen: boolean;
  onNavigate: (id: PrimaryNavId) => void;
  onSelectRoute: (route: ShellRoute) => void;
  onCloseMore: () => void;
  children: ReactNode;
};

/**
 * FigJam 04 Mobile (390): single column, sticky header, banners, bottom nav.
 */
export function MobileShell({
  route,
  moreOpen,
  onNavigate,
  onSelectRoute,
  onCloseMore,
  children,
}: MobileShellProps) {
  return (
    <div className={styles.shell} data-layout="mobile">
      <header className={styles.top}>
        <p className={styles.brand}>Jobhunt Copilot</p>
        <h1>{titleForRoute(route)}</h1>
      </header>
      <div className={styles.banners}>
        <OfflineBanner />
      </div>
      <main className={styles.main}>{children}</main>
      <BottomNav route={route} moreOpen={moreOpen} onNavigate={onNavigate} />
      <MoreMenu
        open={moreOpen}
        route={route}
        variant="sheet"
        onClose={onCloseMore}
        onSelect={onSelectRoute}
      />
    </div>
  );
}
