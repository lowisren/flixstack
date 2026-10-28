import { cn } from "@/lib/utils";
import { gapClasses, type LayoutGap } from "./stack";

/**
 * Responsive column presets: the number is the column count at the widest
 * breakpoint; narrower screens step down to fewer columns.
 */
const columnClasses = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 md:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  "6": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

export type GridColumns = keyof typeof columnClasses;

export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section";
  columns?: GridColumns;
  gap?: LayoutGap;
}

/** Children in equal-width responsive columns. */
export function Grid({ as: Tag = "div", columns = "3", gap = "md", className, ...props }: GridProps) {
  return (
    <Tag
      className={cn("grid min-w-0", columnClasses[columns], gapClasses[gap], className)}
      {...props}
    />
  );
}
