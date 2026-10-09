import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** Accessible name — a switch has no visible text of its own. */
  label: string;
  className?: string;
}

/**
 * A `role="switch"` toggle. Controlled: the owner holds the state, which lets
 * the reduce-effects preference keep its state on <html> + localStorage while
 * sharing this markup.
 *
 * The thumb is the eXistenZ pod curve (`rounded-pod`) on a square track; the
 * on state is carried by fill, border AND thumb position, never colour alone.
 */
export function Switch({ checked, onCheckedChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors",
        checked ? "border-accent bg-accent" : "border-border-control bg-elevated",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-pod transition-transform",
          checked
            ? "translate-x-6 bg-(--color-accent-foreground)"
            : "translate-x-1 bg-(--color-text-secondary)"
        )}
        aria-hidden="true"
      />
    </button>
  );
}
