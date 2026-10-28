import { Calendar } from "lucide-react";
import { cn, formatRuntime, getRatingColor } from "@/lib/utils";
import { Badge } from "../primitives/badge";
import { Eyebrow } from "../primitives/eyebrow";
import { Panel } from "../primitives/panel";
import type { Movie, Title, TvSeries } from "@/lib/types";

/** "Details" sidebar panel: release, rating, runtime or status, and tier. */
export function TitleFactsPanel({ title }: { title: Title }) {
  const movie = title.content_type === "movie" ? (title as Movie) : null;
  const series = title.content_type === "tv_series" ? (title as TvSeries) : null;

  return (
    <Panel padding="sm">
      <Eyebrow as="h2" tracking="widest" weight="semibold" className="mb-4">
        Details
      </Eyebrow>
      <dl className="flex flex-col gap-3">
        <Fact label="Release">
          <dd className="font-mono text-sm text-text-primary flex items-center gap-1 tabular-nums">
            <Calendar className="h-3 w-3 text-text-disabled" aria-hidden="true" />
            {new Date(title.release_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </dd>
        </Fact>
        <Fact label="Rating">
          <dd className={cn("text-sm font-mono font-semibold", getRatingColor(title.rating))}>
            {title.rating}
          </dd>
        </Fact>
        {movie && (
          <Fact label="Runtime">
            <dd className="font-mono text-sm text-text-primary tabular-nums">{formatRuntime(movie.runtime)}</dd>
          </Fact>
        )}
        {series && (
          <Fact label="Status">
            <dd className="font-mono text-sm text-text-primary capitalize">{series.status}</dd>
          </Fact>
        )}
        <Fact label="Tier">
          <dd>
            <Badge variant={title.content_tier === "premium" ? "premium" : "default"} className="capitalize">
              {title.content_tier}
            </Badge>
          </dd>
        </Fact>
      </dl>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <Eyebrow as="dt">{label}</Eyebrow>
      {children}
    </div>
  );
}
