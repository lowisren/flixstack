import { cn } from "@/lib/utils";
import { containers, gutterX, type ContainerWidth } from "../tokens/layout";

const paddingClasses = {
  md: "py-8",
  lg: "py-10",
};

export interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: ContainerWidth;
  padding?: keyof typeof paddingClasses;
}

/**
 * The page content container: a max width, the page gutter and vertical
 * rhythm. Every non-full-bleed page body sits in one of these so content
 * edges line up with the header and footer.
 */
export function PageShell({ width = "wide", padding = "md", className, ...props }: PageShellProps) {
  return <div className={cn(containers[width], gutterX, paddingClasses[padding], className)} {...props} />;
}
