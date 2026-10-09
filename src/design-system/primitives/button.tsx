import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "terminal" | "media";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  asChild?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

// Control borders use --color-border-control, never the decorative divider
// colour: a button's boundary is its affordance, so it owes 3:1 (WCAG 1.4.11).
// `secondary` needs one especially — in light mode its elevated fill sits at
// ~1.06:1 against the page, so without a border the control has no edge at all.
const variantClasses = {
  primary:
    "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary:
    "bg-elevated border-border-control text-text-primary hover:bg-border-control hover:text-(--color-bg-base)",
  ghost:
    "text-text-primary hover:bg-elevated hover:text-accent",
  outline:
    "border-border-control text-text-primary hover:border-accent hover:text-accent",
  danger:
    "bg-(--color-error) text-(--color-bg-base) hover:opacity-90",
  terminal:
    "btn-terminal relative bg-transparent text-accent hover:bg-accent-subtle",
  // Secondary action on artwork (hero, title detail): a translucent on-media
  // fill, so it reads against any image while the fixed scrim carries contrast.
  // `hover:text-(--color-bg-base)` is inherited from when this was `secondary`
  // plus overrides, and is kept for parity — it darkens the label on hover.
  // Logged in docs/design-system-plan.md (follow-ups) for a contrast review.
  media:
    "bg-on-media/20 text-on-media border-on-media/30 hover:bg-on-media/30 hover:text-(--color-bg-base)",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  icon: "p-2",
};

// The terminal variant's bracket ticks need horizontal room to sit outside
// the label, so it carries extra inline padding at every size.
const terminalSizeClasses = {
  sm: "px-5",
  md: "px-6",
  lg: "px-8",
  icon: "px-4",
};

// Mono + uppercase + tracking is the terminal voice; `notch-sm` is the
// corner-cut HUD geometry. The notch means the focus ring arrives as an
// inset box-shadow (see effects.css) — clip-path would clip an outline.
//
// Every variant carries a 1px border, transparent unless the variant colours
// it, so a bordered and an unbordered button are the same height side by side
// (primary + secondary sit together in the hero).
// `transition-colors`, not `transition-all`: box-shadow now carries the focus
// ring, and transitioning it would fade the focus indicator in over 150ms.
// Focus feedback should be immediate.
const baseClasses =
  "inline-flex items-center justify-center gap-2 border border-transparent font-mono font-semibold uppercase tracking-wider notch-sm transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 select-none";

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

/**
 * When `asChild` is true, the button classes are merged onto its single child
 * instead of rendering a <button> — for links that should look like buttons:
 * `<Button asChild><Link href="/">…</Link></Button>`.
 *
 * Not a client component: it holds no state, so server pages can render it
 * directly. Handlers are only passed in from client components.
 */
export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  asChild = false,
  children,
  ref,
  ...props
}: ButtonProps) {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    variant === "terminal" && terminalSizeClasses[size],
    className
  );

  if (asChild) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    if (!isValidElement(child)) return null;
    return cloneElement(child, {
      className: cn(classes, child.props?.className),
    });
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          <span className="sr-only">Loading…</span>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
