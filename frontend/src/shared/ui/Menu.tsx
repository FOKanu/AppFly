import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { MenuIcon, type MenuIconName } from "./MenuIcon";

/** One row in a dropdown menu. */
export interface MenuItemSpec {
  id: string;
  label: string;
  icon?: MenuIconName;
  /** Right-aligned hint — a shortcut, a count, or a status word. */
  detail?: string;
  /** Navigate here when chosen. Mutually exclusive with `onSelect`. */
  to?: string;
  onSelect?: () => void;
  /** Renders the item inert; `reason` becomes its tooltip and its a11y note. */
  disabled?: boolean;
  reason?: string;
  /** Shows a check on the left — used for the active profile. */
  checked?: boolean;
  tone?: "default" | "danger";
}

/** A labelled group of items. */
export interface MenuSectionSpec {
  id: string;
  label: string;
  items: MenuItemSpec[];
}

interface MenuProps {
  sections: MenuSectionSpec[];
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number;
  onChoose: () => void;
  labelledBy: string;
  /** Rendered above the first section — the active-context summary. */
  header?: ReactNode;
  /** Rendered under the last section — usually the keyboard hint. */
  footer?: ReactNode;
}

/**
 * Purpose: Render a grouped dropdown from a data description, with a roving
 *          tabindex, icons and an explained disabled state.
 * Inputs: Sections of items plus the registration callbacks from `useMenu`.
 * Returns: A `role="menu"` tree; disabled items are skipped by arrow keys.
 * Does not: own open state or placement — the caller's `useMenu` does.
 */
export function Menu({
  sections,
  registerItem,
  activeIndex,
  onChoose,
  labelledBy,
  header,
  footer,
}: MenuProps) {
  const navigate = useNavigate();
  let cursor = -1;

  return (
    <div className="menu" role="menu" aria-labelledby={labelledBy}>
      {header ? <div className="menu__header">{header}</div> : null}

      <div className="menu__scroll">
        {sections.map((section) => (
        <div className="menu__section" key={section.id} role="group" aria-label={section.label}>
          <p className="menu__section-label">{section.label}</p>
          {section.items.map((item) => {
            cursor += 1;
            const index = cursor;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={[
                  "menu__item",
                  item.tone === "danger" ? "menu__item--danger" : "",
                  item.checked ? "is-checked" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                ref={(element) => registerItem(index, element)}
                tabIndex={index === activeIndex ? 0 : -1}
                disabled={item.disabled}
                title={item.disabled ? item.reason : undefined}
                aria-describedby={item.disabled && item.reason ? `${item.id}-reason` : undefined}
                onClick={() => {
                  if (item.disabled) return;
                  if (item.to) navigate(item.to);
                  item.onSelect?.();
                  onChoose();
                }}
              >
                <span className="menu__icon" aria-hidden="true">
                  {item.icon ? <MenuIcon name={item.icon} /> : null}
                </span>
                <span className="menu__label">{item.label}</span>
                {item.checked ? (
                  <span className="menu__check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
                {item.detail ? <span className="menu__detail">{item.detail}</span> : null}
                {item.disabled ? (
                  <span className="menu__lock" aria-hidden="true">
                    –
                  </span>
                ) : null}
                {item.disabled && item.reason ? (
                  <span id={`${item.id}-reason`} className="menu__sr-only">
                    {item.reason}
                  </span>
                ) : null}
              </button>
            );
          })}
          </div>
        ))}
      </div>

      {footer ? <div className="menu__footer">{footer}</div> : null}
    </div>
  );
}
