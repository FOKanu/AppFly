import type { HTMLAttributes, ReactNode } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "article";
  children: ReactNode;
}

/**
 * Purpose: Recessed surface for page bodies inside the shell.
 * Does not: load jobs, letters, or settings secrets.
 */
export function Panel({ as: Tag = "section", className, children, ...rest }: PanelProps) {
  const classes = ["panel", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
