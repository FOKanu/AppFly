interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  /** Renders every option inert — used where the backend cannot persist it. */
  disabled?: boolean;
  /** Tooltip explaining why it is disabled. */
  disabledReason?: string;
}

/**
 * Purpose: Small inline mode switch (Last run / Live / 7 nights, EN / DE, …).
 * Does not: persist the choice; the caller holds the state.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  disabled = false,
  disabledReason,
}: SegmentedProps<T>) {
  const classes = ["segmented", disabled ? "is-disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={
            option.value === value ? "segmented__option is-active" : "segmented__option"
          }
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
