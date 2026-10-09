import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Clock, Tv } from "lucide-react";
import { cn, formatRuntime } from "@/lib/utils";
import { gutterX } from "../tokens/layout";
import { Badge } from "../primitives/badge";
import { Button } from "../primitives/button";
import { Heading } from "../primitives/heading";
import { RatingBadge } from "../patterns/rating-badge";
import { Score } from "../patterns/score";
import type { Movie, Title, TvSeries } from "@/lib/types";

export interface TitleDetailHeaderProps {
  title: Title;
  /** Label for the primary action, e.g. "Play Movie" or "Play Episode 1". */
  playLabel: string;
  canPlay: boolean;
  onPlay: () => void;
}

const metaClass = "font-mono text-xs text-on-media/70";

/**
 * The artwork header on a title's watch page: poster, rating, metadata,
 * title, score, genres and the play / watchlist actions.
 */
export function TitleDetailHeader({ title, playLabel, canPlay, onPlay }: TitleDetailHeaderProps) {
  const movie = title.content_type === "movie" ? (title as Movie) : null;
  const series = title.content_type === "tv_series" ? (title as TvSeries) : null;

  return (
    <section
      className="hud-frame relative w-full h-[55vh] min-h-95 overflow-hidden bg-media-ground"
      aria-label={`${title.title} hero image`}
      data-cs-entry={title.uid}
      data-cs-content-type={title.content_type}
    >
      {title.hero_image && (
        <Image
          src={title.hero_image.url}
          alt={`${title.title} hero image`}
          fill
          className="object-cover"
          priority
          {...title.$?.hero_image}
        />
      )}
      {/* Same fixed-dark scrim as the homepage hero: this copy is on-media
          white in both themes, so a theme-following vignette would put it on
          a near-white ground in light mode. */}
      <div className="hero-scrim scanlines absolute inset-0" aria-hidden="true" />

      <div className={cn("relative h-full flex items-end pb-8", gutterX)}>
        <div className="flex items-end gap-6">
          {/* Poster */}
          <div className="notch hidden sm:block w-32 overflow-hidden shrink-0 border border-on-media/15">
            {title.thumbnail && (
              <Image
                src={title.thumbnail.url}
                alt={title.title}
                width={128}
                height={192}
                className="object-cover"
                {...title.$?.thumbnail}
              />
            )}
          </div>

          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {title.content_tier === "premium" && <Badge variant="premium">Premium</Badge>}
              <RatingBadge rating={title.rating} />
              <span className={cn(metaClass, "tabular-nums")}>
                {new Date(title.release_date).getFullYear()}
              </span>
              {movie && (
                <span className={cn(metaClass, "flex items-center gap-1 tabular-nums")}>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {series && (
                <span className={cn(metaClass, "flex items-center gap-1")}>
                  <Tv className="h-3 w-3" aria-hidden="true" />
                  {series.seasons.length} Season{series.seasons.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <Heading
              as="h1"
              size="3xl"
              tone="media"
              className="chromatic sm:text-4xl mb-3 leading-tight"
              {...title.$?.title}
            >
              {title.title}
            </Heading>

            <div className="flex items-center gap-3 mb-4">
              <Score value={title.score} size="hero" />
              {title.genres.map((g) => (
                <Link
                  key={g.uid}
                  href={`/genre/${g.slug}`}
                  className="font-mono text-xs uppercase tracking-wider text-on-media/70 hover:text-accent transition-colors"
                >
                  {g.title}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="lg"
                className="gap-2"
                onClick={onPlay}
                disabled={!canPlay}
                title={canPlay ? undefined : "No video available yet"}
              >
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                {playLabel}
              </Button>
              <Button variant="media" size="lg" className="gap-2">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Watchlist
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
