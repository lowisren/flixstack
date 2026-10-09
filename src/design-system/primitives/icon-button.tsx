import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

/**
 * Square, notched, icon-only control.
 *
 *   surface — on page surfaces (rail scroll arrows)
 *   ghost   — borderless, in chrome (header search / profile)
 *   media   — on artwork, over a dark shade (hero carousel arrows)
 *   glass   — on artwork inside a notched card (title-card watchlist)
 *   accent  — the filled primary action on artwork (title-card play)
 *
 * `glass` sits inside a clip-path container, which would clip an outward
 * outline, so it takes the inset focus ring (`.focus-inset`). The others are
 * notched themselves and get the two-tone inset ring from `.notch-sm`.
 */
const variantClasses = {
  surface: "border border-border-control bg-surface text-text-secondary hover:border-accent hover:text-accent",
  ghost: "text-text-secondary hover:text-accent hover:bg-elevated",
  media: "border border-on-media/25 bg-media-shade/70 text-on-media hover:border-accent hover:text-accent",
  glass: "focus-inset border border-on-media/30 bg-on-media/15 text-on-media hover:border-accent hover:text-accent",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  // Sized by padding rather than a fixed box, for chrome that aligns to text.
  pad: "inline-flex p-2",
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name. Required unless the control is hidden from assistive tech. */
  label?: string;
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  /** Merge the classes onto a single child (e.g. a `<Link>`) instead of rendering a button. */
  asChild?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

export function IconButton({
  label,
  variant = "surface",
  size = "md",
  asChild = false,
  className,
  children,
  ref,
  ...props
}: IconButtonProps) {
  const classes = cn(
    "notch-sm flex items-center justify-center transition-colors",
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  if (asChild) {
    const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
    if (!isValidElement(child)) return null;
    return cloneElement(child, {
      className: cn(classes, child.props?.className),
      ...(label ? { "aria-label": label } : {}),
    });
  }

  return (
    <button ref={ref} type="button" aria-label={label} className={classes} {...props}>
      {children}
    </button>
  );
}
