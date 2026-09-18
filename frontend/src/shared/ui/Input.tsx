import type { InputHTMLAttributes, Ref } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * Purpose: Compact text field for chrome search (⌘K).
 * Does not: query the job queue or accept connector keys.
 */
export function Input({ hint, className, ref, ...rest }: InputProps) {
  const classes = ["input", className].filter(Boolean).join(" ");
  return (
    <label className="input-wrap">
      <input ref={ref} className={classes} {...rest} />
      {hint ? <kbd className="input__hint">{hint}</kbd> : null}
    </label>
  );
}
