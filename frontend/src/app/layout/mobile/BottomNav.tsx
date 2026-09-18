import { PRIMARY_NAV, isMoreRoute, type PrimaryNavId, type ShellRoute } from "./nav";
import styles from "./BottomNav.module.css";

/** Props for {@link BottomNav}. */
export type BottomNavProps = {
  route: ShellRoute;
  moreOpen: boolean;
  onNavigate: (id: PrimaryNavId) => void;
};

/**
 * FigJam 04 five-tab bar for 390px mobile. More opens a sheet, not a page.
 */
export function BottomNav({ route, moreOpen, onNavigate }: BottomNavProps) {
  return (
    <nav className={styles.bar} aria-label="Primary">
      {PRIMARY_NAV.map((item) => {
        const selected =
          item.id === "more" ? moreOpen || isMoreRoute(route) : route === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={selected ? `${styles.item} ${styles.selected}` : styles.item}
            aria-current={selected ? "page" : undefined}
            aria-pressed={item.id === "more" ? moreOpen : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.icon} aria-hidden="true">
              <NavGlyph id={item.id} />
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Stroke icons for the five primary destinations. */
export function NavGlyph({ id }: { id: PrimaryNavId }) {
  switch (id) {
    case "tonight":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M12 3a9 9 0 1 0 8.7 11.4A7 7 0 0 1 12 3Z"
          />
        </svg>
      );
    case "queue":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h10v2H4v-2Z"
          />
        </svg>
      );
    case "workflow":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M4 5h6v4H4V5Zm10 0h6v6h-6V5ZM4 13h6v6H4v-6Zm10 4h6v2h-6v-2Z"
          />
        </svg>
      );
    case "activity":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path
            fill="currentColor"
            d="M3 12h4l2.5-6 5 12L17 12h4v-2h-5.2L13.5 4h-3L7.2 10H3v2Z"
          />
        </svg>
      );
    case "more":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22">
          <circle cx="6" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="18" cy="12" r="1.8" fill="currentColor" />
        </svg>
      );
  }
}
