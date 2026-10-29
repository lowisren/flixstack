import { cn } from "@/lib/utils";

/**
 * Spacing between the children of the layout primitives (Stack, Row, Grid).
 * The steps are the gaps already used across the app (gap-2 … gap-12).
 */
export const gapClasses = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
};

export type LayoutGap = keyof typeof gapClasses;

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "header" | "footer";
  gap?: LayoutGap;
  /** Cross-axis alignment of the children. */
  align?: keyof typeof alignClasses;
}

/**
 * Children in a vertical column with even spacing. The default building block
 * for anything read top to bottom: a heading over body copy over a button.
 */
export function Stack({ as: Tag = "div", gap = "sm", align = "stretch", className, ...props }: StackProps) {
  return (
    <Tag
      className={cn("flex min-w-0 flex-col", gapClasses[gap], alignClasses[align], className)}
      {...props}
    />
  );
}
