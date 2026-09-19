interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Purpose: On/off toggle for scout sources and the nightly schedule.
 * Does not: call the API; the owning panel decides what a flip means.
 */
export function Switch({ checked, onChange, label, disabled, className }: SwitchProps) {
  const classes = ["switch", className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={classes}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
