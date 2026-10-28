import { cn } from "@/lib/utils";
import { gapClasses, type LayoutGap } from "./stack";

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

// Static strings so Tailwind can see them: used when a collapsed row is side by side.
const mdAlignClasses = {
  start: "md:items-start",
  center: "md:items-center",
  end: "md:items-end",
  stretch: "md:items-stretch",
  baseline: "md:items-baseline",
};

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export interface RowProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "header" | "footer";
  gap?: LayoutGap;
  /** Cross-axis alignment of the children. */
  align?: keyof typeof alignClasses;
  justify?: keyof typeof justifyClasses;
  /** Let children wrap onto further lines when they run out of room. */
  wrap?: boolean;
  /**
   * Stack the children vertically below the `md` breakpoint (768px) — for
   * media-plus-copy layouts that would be too cramped side by side on a phone.
   */
  collapse?: boolean;
  /** Reverse the visual order at `md` and up (e.g. image on the right). Source order, and so reading order, is unchanged. */
  reverse?: boolean;
}

/** Children side by side in a horizontal row with even spacing. */
export function Row({
  as: Tag = "div",
  gap = "sm",
  align = "center",
  justify = "start",
  wrap = false,
  collapse = false,
  reverse = false,
  className,
  ...props
}: RowProps) {
  return (
    <Tag
      className={cn(
        "flex min-w-0",
        collapse ? "flex-col md:flex-row" : "flex-row",
        reverse && "md:flex-row-reverse",
        wrap && "flex-wrap",
        gapClasses[gap],
        // A collapsed row stretches its stacked children to full width on small screens.
        collapse ? cn("items-stretch", mdAlignClasses[align]) : alignClasses[align],
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  );
}
