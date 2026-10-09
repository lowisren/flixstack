import { cn } from "@/lib/utils";

export interface SegmentedControlProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * One-of-many choice as a `radiogroup`. The selected option is shown by a
 * raised surface AND the accent colour, plus `aria-checked`.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div
      className={cn("flex items-center gap-1 border border-border bg-elevated p-1", className)}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          role="radio"
          aria-checked={value === option.value}
          className={cn(
            "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
            value === option.value ? "bg-surface text-accent" : "text-text-secondary hover:text-text-primary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
