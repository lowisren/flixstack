import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "accent"
    | "info"
    | "signal"
    | "premium"
    | "rating"
    | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  // Every subtle/foreground pair below is verified at >= 4.5:1 — see the
  // token tables in docs/cyber-redesign-plan.md.
  const variants = {
    default:
      "bg-elevated text-text-secondary border border-border-control",
    accent:
      "bg-accent-subtle text-accent border border-accent/40",
    info:
      "bg-info-subtle text-info border border-info/40",
    signal:
      "bg-signal-subtle text-signal border border-signal/40",
    premium:
      "bg-premium-subtle text-premium border border-premium/40",
    rating:
      "bg-elevated text-text-primary border border-border-control",
    outline:
      "border border-border-control text-text-secondary",
  };

  return (
    <span
      className={cn(
        // Badges carry data, so they take the mono voice and tabular figures —
        // scores and years line up in a column across a rail.
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-chip font-mono text-xs font-medium uppercase tracking-wider tabular-nums",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
