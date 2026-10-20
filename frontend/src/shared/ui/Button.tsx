import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useSingleKeyShortcuts } from "../useShortcuts";

type ButtonVariant = "primary" | "approve" | "ghost" | "danger" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Leading glyph (▶, ‖, ■, ↗ …) rendered before the label. */
  icon?: ReactNode;
  /** Keycap rendered after the label. */
  shortcut?: string;
  size?: "md" | "sm";
  children: ReactNode;
}

// Exported helper function to convert shortcuts for aria-keyshortcuts
export const ariaKeyShortcuts = (cap: string): string | undefined => {
  if (!cap) return undefined;

  // Single character caps
  if (cap.length === 1) return cap;

  // Shift combinations
  if (cap.startsWith("⇧")) {
    return `Shift+${cap.slice(1)}`;
  }

  // Special cases for Esc, ⌘Z, ⌘K
  if (cap === "Esc") return "Escape";
  if (cap === "⌘Z") return "Meta+Z Control+Z";
  if (cap === "⌘K") return "Meta+K Control+K";

  // Anything with a space or other special cases
  if (cap.includes(" ")) return undefined;

  // Everything else
  return undefined;
};

/**
 * Purpose: Instrument-panel control at the Figma 32px height, with optional
 *          leading glyph and trailing keycap.
 * Does not: submit applications or trigger crawls.
 */
export function Button({
  variant = "ghost",
  icon,
  shortcut,
  size = "md",
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "button",
    `button--${variant}`,
    size === "sm" ? "button--sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isSingleKey = useSingleKeyShortcuts();

  // Determine if this is a character cap (not Esc, ⌘Z or ⌘K)
  const isCharacterCap = !["Esc", "⌘Z", "⌘K"].includes(shortcut || "");

  // Conditionally render the kbd element
  const shouldShowKbd = shortcut &&
    (isCharacterCap ? isSingleKey : true);

  return (
    <button
      type={type}
      className={classes}
      {...rest}
      aria-keyshortcuts={shouldShowKbd && shortcut ? ariaKeyShortcuts(shortcut) : undefined}
    >
      {icon ? (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="button__label">{children}</span>
      {shouldShowKbd ? (
        <kbd className="button__kbd" aria-hidden="true">{shortcut}</kbd>
      ) : null}
    </button>
  );
}
