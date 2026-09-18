import { useEffect, useMemo, useState } from "react";
import { useBreakpoint } from "../../../shared/useBreakpoint";
import { MobileShell } from "./MobileShell";
import { TabletShell } from "./TabletShell";
import { PolicyAside, ShellScreen, fixtureFromSearch } from "./screens";
import { type PrimaryNavId, type ShellRoute } from "./nav";

/**
 * Pick FigJam 04 Mobile or 03 Tablet chrome from viewport width.
 * Desktop (≥1024) reuses the tablet shell so we do not rewrite page files.
 */
export function ResponsiveShell() {
  const { isMobile } = useBreakpoint();
  const [route, setRoute] = useState<ShellRoute>("tonight");
  const [moreOpen, setMoreOpen] = useState(false);
  const fixture = useMemo(
    () =>
      typeof window === "undefined" ? null : fixtureFromSearch(window.location.search),
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onNavigate = (id: PrimaryNavId) => {
    if (id === "more") {
      setMoreOpen((open) => !open);
      return;
    }
    setMoreOpen(false);
    setRoute(id);
  };

  const onSelectRoute = (next: ShellRoute) => {
    setRoute(next);
    setMoreOpen(false);
  };

  const screen = (
    <ShellScreen route={route} fixture={fixture} onOpenSettings={onSelectRoute} />
  );

  if (isMobile) {
    return (
      <MobileShell
        route={route}
        moreOpen={moreOpen}
        onNavigate={onNavigate}
        onSelectRoute={onSelectRoute}
        onCloseMore={() => setMoreOpen(false)}
      >
        {screen}
      </MobileShell>
    );
  }

  return (
    <TabletShell
      route={route}
      moreOpen={moreOpen}
      aside={<PolicyAside />}
      onNavigate={onNavigate}
      onSelectRoute={onSelectRoute}
      onCloseMore={() => setMoreOpen(false)}
    >
      {screen}
    </TabletShell>
  );
}
