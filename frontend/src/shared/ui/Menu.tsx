import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

/** One row in a dropdown menu. */
export interface MenuItemSpec {
  id: string;
  label: string;
  /** Right-aligned hint — a shortcut, a count, or a status word. */
  detail?: string;
  /** Navigate here when chosen. Mutually exclusive with `onSelect`. */
  to?: string;
  onSelect?: () => void;
  /** Renders the item greyed out; `reason` becomes its tooltip and helper. */
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
  /** Flat index offset bookkeeping is handled here; parent supplies the hook. */
  registerItem: (index: number, element: HTMLElement | null) => void;
  activeIndex: number;
  onChoose: () => void;
  labelledBy: string;
  children?: ReactNode;
}

/**
 * Purpose: Render a grouped dropdown menu with roving tabindex, from a data
 *          description rather than hand-written markup per menu.
 * Inputs: Sections of items plus the registration callbacks from `useMenu`.
 * Returns: A `role="menu"` list; disabled items stay focusable-by-arrow-skip.
 * Does not: own open state — the caller's `useMenu` does.
 */
export function Menu({
  sections,
  registerItem,
  activeIndex,
  onChoose,
  labelledBy,
  children,
}: MenuProps) {
  const navigate = useNavigate();
  let cursor = -1;

  return (
    <div className="menu" role="menu" aria-labelledby={labelledBy}>
      {children}
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
                <span className="menu__check" aria-hidden="true">
                  {item.checked ? "✓" : ""}
                </span>
                <span className="menu__label">{item.label}</span>
                {item.detail ? <span className="menu__detail">{item.detail}</span> : null}
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
  );
}
