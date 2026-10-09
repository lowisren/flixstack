import { cn } from "@/lib/utils";
import { TitleCard } from "./title-card";
import type { Title } from "@/lib/types";

/**
 * Column presets in use. `landscape-*` renders 16:9 cards, `portrait-*` 2:3
 * posters; the number is the column count at the widest breakpoint.
 */
const columnClasses = {
  "landscape-4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  "portrait-4": "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  "portrait-5": "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  "portrait-6": "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
};

export interface TitleGridProps {
  titles: Title[];
  columns: keyof typeof columnClasses;
  /** Accessible name for the list, e.g. "24 titles". */
  label?: string;
}

/** A responsive grid of title cards, exposed to assistive tech as a list. */
export function TitleGrid({ titles, columns, label }: TitleGridProps) {
  const layout = columns.startsWith("landscape") ? "landscape" : "portrait";
  return (
    <div className={cn("grid gap-4", columnClasses[columns])} role="list" aria-label={label}>
      {titles.map((title) => (
        <div key={title.uid} role="listitem">
          <TitleCard
            title={title}
            layout={layout}
            fullWidth
            data-cs-entry={title.uid}
            data-cs-content-type={title.content_type}
          />
        </div>
      ))}
    </div>
  );
}
