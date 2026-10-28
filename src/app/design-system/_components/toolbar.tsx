import { ReduceEffectsControl, ThemeToggle } from "@/design-system";
import { specimenId } from "./specimen";

export interface TocGroup {
  id: string;
  title: string;
  items: string[];
}

/**
 * Sticky catalog controls. Uses the site's own theme and reduce-effects
 * toggles, so every example responds exactly as the real pages do.
 * Sits under the sticky site header (h-16).
 */
export function Toolbar({ groups }: { groups: TocGroup[] }) {
  return (
    <div className="sticky top-16 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <ThemeToggle />
        <ReduceEffectsControl />
        <nav aria-label="Design system sections" className="flex flex-wrap gap-x-4 gap-y-1 ml-auto">
          {groups.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="font-mono text-xs uppercase tracking-wider text-text-secondary hover:text-accent"
            >
              {g.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Full index of every specimen, grouped by level. */
export function Index({ groups }: { groups: TocGroup[] }) {
  return (
    <nav aria-label="Component index" className="grid grid-cols-2 md:grid-cols-5 gap-6">
      {groups.map((g) => (
        <div key={g.id}>
          <a href={`#${g.id}`} className="font-mono text-xs font-semibold uppercase tracking-widest text-text-primary hover:text-accent">
            {g.title}
          </a>
          <ul className="mt-2 space-y-1" role="list">
            {g.items.map((item) => (
              <li key={item}>
                <a href={`#${specimenId(item)}`} className="text-sm text-text-secondary hover:text-accent">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
