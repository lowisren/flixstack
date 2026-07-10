import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "accent" | "premium" | "rating" | "outline";
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
    accent:
      "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20",
    premium:
      "bg-[var(--color-premium-subtle)] text-[var(--color-premium)] border border-[var(--color-premium)]/20",
    rating:
      "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-mono",
    outline:
      "border border-[var(--color-border)] text-[var(--color-text-secondary)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
