import { MORE_LINKS, SETTINGS_LINKS, type ShellRoute } from "./nav";
import styles from "./MoreMenu.module.css";

/** Props for {@link MoreMenu}. */
export type MoreMenuProps = {
  open: boolean;
  route: ShellRoute;
  variant: "sheet" | "panel";
  onClose: () => void;
  onSelect: (route: ShellRoute) => void;
};

/**
 * More destinations: Memory, Activity, Settings (vault, connectivity, API keys).
 * Settings here is navigation only — keys are never displayed.
 */
export function MoreMenu({ open, route, variant, onClose, onSelect }: MoreMenuProps) {
  if (!open) return null;

  return (
    <div className={variant === "sheet" ? styles.sheetRoot : styles.panelRoot}>
      {variant === "sheet" ? (
        <button type="button" className={styles.backdrop} aria-label="Close More" onClick={onClose} />
      ) : null}
      <div
        className={variant === "sheet" ? styles.sheet : styles.panel}
        role="dialog"
        aria-label="More"
      >
        <header className={styles.head}>
          <h2>More</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </header>
        <ul className={styles.list}>
          {MORE_LINKS.map((link) => (
            <li key={link.route}>
              <button
                type="button"
                className={route === link.route ? `${styles.row} ${styles.active}` : styles.row}
                onClick={() => onSelect(link.route)}
              >
                <span>
                  <strong>{link.label}</strong>
                  <em>{link.hint}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.group}>Settings</p>
        <ul className={styles.list}>
          {SETTINGS_LINKS.map((link) => (
            <li key={link.route}>
              <button
                type="button"
                className={route === link.route ? `${styles.row} ${styles.active}` : styles.row}
                onClick={() => onSelect(link.route)}
              >
                <span>
                  <strong>{link.label}</strong>
                  <em>{link.hint}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.policy}>
          Human submit only. No Easy Apply. Deny-listed job boards stay out of
          crawl and Apify.
        </p>
      </div>
    </div>
  );
}
