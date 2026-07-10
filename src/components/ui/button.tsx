"use client";

import { cloneElement, forwardRef, isValidElement } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  asChild?: boolean;
}

const variantClasses = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] focus-visible:outline-[var(--color-focus-ring)]",
  secondary:
    "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)] focus-visible:outline-[var(--color-focus-ring)]",
  ghost:
    "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:outline-[var(--color-focus-ring)]",
  outline:
    "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:outline-[var(--color-focus-ring)]",
  danger:
    "bg-[var(--color-error)] text-white hover:opacity-90 focus-visible:outline-[var(--color-error)]",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  icon: "p-2",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none";

export interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

// When asChild is true, render as a styled <a> wrapper instead of <button>
// Usage: <Button asChild><Link href="/">…</Link></Button>
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

    if (asChild) {
      // Clone the single child, merging the button classes into it
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
            <span
              className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">Loading…</span>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
