import { PageShell } from "./page-shell";

export interface DetailTemplateProps {
  /** Full-bleed header, e.g. TitleDetailHeader or the inline player. */
  hero: React.ReactNode;
  /** Primary column (two thirds on large screens). */
  main: React.ReactNode;
  /** Sidebar column — pass the complete `<aside>` so it keeps its own landmarks and edit tags. */
  aside: React.ReactNode;
  /** Full-width content after the columns, e.g. a related-titles rail. */
  after?: React.ReactNode;
}

/** Detail page: a full-bleed hero, then a main column and a sidebar. */
export function DetailTemplate({ hero, main, aside, after }: DetailTemplateProps) {
  return (
    <div>
      {hero}
      <PageShell padding="lg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-8">{main}</div>
          {aside}
        </div>
        {after}
      </PageShell>
    </div>
  );
}
