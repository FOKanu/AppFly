import type { ButtonHTMLAttributes, ReactNode } from "react";

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

  return (
    <button type={type} className={classes} {...rest}>
      {icon ? (
        <span className="button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="button__label">{children}</span>
      {shortcut ? <kbd className="button__kbd">{shortcut}</kbd> : null}
    </button>
  );
}
