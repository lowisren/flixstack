import { cn } from "@/lib/utils";

export interface ToggleChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> {
  pressed: boolean;
  size?: "sm" | "md";
}

/**
 * A pressable filter chip (`aria-pressed`). Use for independent on/off
 * choices — genre filters, favourite genres. For one-of-many choices use
 * SegmentedControl, which is a radio group.
 */
export function ToggleChip({ pressed, size = "md", className, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "notch-sm border font-mono text-xs uppercase tracking-wider transition-colors",
        size === "sm" ? "px-3 py-1.5" : "px-4 py-2",
        pressed
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-control bg-elevated text-text-secondary hover:border-accent hover:text-accent",
        className
      )}
      {...props}
    />
  );
}
