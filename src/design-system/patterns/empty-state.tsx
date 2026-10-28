import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "../primitives/panel";
import { Eyebrow } from "../primitives/eyebrow";
import { Heading } from "../primitives/heading";

export interface EmptyStateProps {
  icon?: LucideIcon;
  /** The status line above the title. */
  signal?: string;
  title?: React.ReactNode;
  titleSize?: "lg" | "xl";
  description: React.ReactNode;
  /** A recovery action, e.g. a "Clear all filters" button. */
  action?: React.ReactNode;
  /** `loose` adds a little more room under the status line. */
  spacing?: "tight" | "loose";
  /** Width and padding of the panel. */
  className?: string;
}

/** The "No signal" panel shown when a list or search has no results. */
export function EmptyState({
  icon: Icon,
  signal = "No signal",
  title,
  titleSize = "lg",
  description,
  action,
  spacing = "tight",
  className,
}: EmptyStateProps) {
  return (
    <Panel border="control" scanlines className={cn("text-center", className)}>
      {Icon && <Icon className="h-10 w-10 text-text-disabled mb-4" aria-hidden="true" />}
      <Eyebrow tone="signal" tracking="widest" className={spacing === "loose" ? "mb-3" : "mb-2"}>
        {signal}
      </Eyebrow>
      {title && (
        <Heading as="h2" size={titleSize} className="mb-2">
          {title}
        </Heading>
      )}
      <p className={cn("text-text-secondary", action && "mb-4")}>{description}</p>
      {action}
    </Panel>
  );
}
