import { cn } from "@/lib/utils";

/**
 * The notched surface container — sidebar cards, preference panels, setup
 * steps, empty states.
 *
 * `relative` is part of the primitive, not optional: `.scanlines` and other
 * texture classes draw with positioned pseudo-elements but never declare
 * `position` themselves (see the CASCADE RULE in effects.css), so the
 * container must supply it.
 *
 *   border="divider"  decorative edge (--color-border), for content panels
 *   border="control"  3:1 edge (--color-border-control), when the panel's
 *                     boundary is the only thing that identifies it
 */
const borderClasses = {
  divider: "border-border",
  control: "border-border-control",
};

const paddingClasses = {
  none: "",
  sm: "p-5",
  md: "p-6",
};

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "aside" | "li" | "details";
  border?: keyof typeof borderClasses;
  padding?: keyof typeof paddingClasses;
  /** Adds the CRT scanline overlay (gated by the effect tokens). */
  scanlines?: boolean;
}

export function Panel({
  as: Tag = "div",
  border = "divider",
  padding = "none",
  scanlines = false,
  className,
  ...props
}: PanelProps) {
  return (
    <Tag
      className={cn(
        "notch relative border bg-surface",
        borderClasses[border],
        paddingClasses[padding],
        scanlines && "scanlines",
        className
      )}
      {...props}
    />
  );
}
