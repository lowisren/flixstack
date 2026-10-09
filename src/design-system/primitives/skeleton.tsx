import { cn } from "@/lib/utils";

/**
 * A single loading placeholder. Purely decorative and hidden from assistive
 * tech — a card skeleton is several of these, and a rail is several cards, so
 * announcing each one would fire a dozen simultaneous live regions. The
 * *group* carries the single `role="status"`; see `SkeletonGroup`.
 *
 * The scanline sweep lives on `.skeleton` in globals.css, which also defines
 * its reduced-motion and `.reduce-fx` static states.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton relative rounded-panel", className)}
      {...props}
    />
  );
}

/**
 * Wraps a set of skeletons in one polite live region, so a loading rail
 * announces "Loading…" once rather than once per placeholder.
 */
export function SkeletonGroup({
  label = "Loading…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={label} aria-live="polite" className={className}>
      {children}
    </div>
  );
}

export function TitleCardSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <SkeletonGroup
      label="Loading featured content…"
      // Matches Hero's own sizing so there is no layout shift when the real
      // banner replaces it.
      className="relative w-full h-[60vh] min-h-100 max-h-175 skeleton"
    >
      <div className="absolute bottom-12 left-4 sm:left-6 lg:left-8 flex flex-col gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96 max-w-[80vw]" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-11 w-32" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </SkeletonGroup>
  );
}
