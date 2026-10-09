import { cn } from "@/lib/utils";
import { Heading } from "../primitives/heading";
import { SlashMarker } from "../primitives/eyebrow";
import type { CslpTag } from "@/lib/types";

export interface SectionHeaderProps {
  title: string;
  /** Live Preview edit tag for the title field. */
  editable?: CslpTag;
  /** Right-aligned controls, e.g. CarouselControls or a "View all" link. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * `// TITLE` section header with optional trailing actions.
 *
 * The marker is a sibling of the heading, not inside it, so a Live Preview
 * edit tag on the heading stays bound to the title text alone.
 */
export function SectionHeader({ title, editable, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <div className="flex items-baseline gap-2 min-w-0">
        <SlashMarker className="font-mono text-sm shrink-0" />
        <Heading as="h2" size="lg" className="truncate" {...editable}>
          {title}
        </Heading>
      </div>
      {actions}
    </div>
  );
}
