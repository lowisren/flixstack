import { cn } from "@/lib/utils";

/**
 * Indeterminate loading ring. Decorative — the control or region that is
 * loading owns the announcement (Button pairs it with an sr-only "Loading…").
 * The spin is a CSS animation, so reduced motion freezes it via the global
 * duration override in a11y.css.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin",
        className
      )}
      aria-hidden="true"
    />
  );
}
