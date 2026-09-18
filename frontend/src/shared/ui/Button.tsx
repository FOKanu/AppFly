import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "danger" | "quiet";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  shortcut?: string;
  children: ReactNode;
}

/**
 * Purpose: Compact 32px instrument-panel control.
 * Does not: submit applications or trigger crawls.
 */
export function Button({
  variant = "ghost",
  shortcut,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = ["button", `button--${variant}`, className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      <span className="button__label">{children}</span>
      {shortcut ? <kbd className="button__kbd">{shortcut}</kbd> : null}
    </button>
  );
}
