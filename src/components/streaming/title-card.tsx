"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Plus, Star } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatRuntime } from "@/lib/utils";
import type { Movie, TvSeries } from "@/lib/types";

interface TitleCardProps {
  title: Movie | TvSeries;
  layout?: "landscape" | "portrait";
  /** Stretch to fill the parent (e.g. a responsive grid cell) instead of the
   * fixed rail width. */
  fullWidth?: boolean;
  "data-cs-entry"?: string;
  "data-cs-content-type"?: string;
}

export function TitleCard({
  title,
  layout = "landscape",
  fullWidth = false,
  ...props
}: TitleCardProps) {
  const [imgError, setImgError] = useState(false);

  const href = `/watch/${title.slug}`;
  const isMovie = title.content_type === "movie";
  const runtime = isMovie ? (title as Movie).runtime : null;

  return (
    <article
      // `notch` + `sweep-host` replace the old hover:scale-105. Scaling the
      // whole card forces layout work for every card in a rail; the sweep is a
      // transform on a pseudo-element, which composites.
      className="notch group sweep-host relative shrink-0 overflow-hidden bg-elevated"
      style={{ width: fullWidth ? "100%" : layout === "portrait" ? "160px" : "280px" }}
      data-cs-entry={props["data-cs-entry"]}
      data-cs-content-type={props["data-cs-content-type"]}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative overflow-hidden bg-elevated",
          layout === "portrait" ? "aspect-2/3" : "aspect-video"
        )}
      >
        {!imgError && title.thumbnail ? (
          <Image
            src={title.thumbnail.url}
            alt={`${title.title} thumbnail`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={layout === "portrait" ? "160px" : "280px"}
            onError={() => setImgError(true)}
            {...title.$?.thumbnail}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-elevated">
            <Play className="h-8 w-8 text-text-disabled" aria-hidden="true" />
          </div>
        )}

        {/* Scan sweep — decorative, gated by --fx-sweep-opacity */}
        <span className="sweep" aria-hidden="true" />

        {/* Hover / focus overlay.
            Not aria-hidden: it holds the watchlist button, and an aria-hidden
            container with a focusable child is an ARIA violation (axe
            `aria-hidden-focus`) — it also let keyboard users focus an
            invisible control. The overlay now reveals on focus-within too, so
            the button is visible whenever it is focused. Only the duplicate
            play link is hidden, since the title link already goes there. */}
        <div className="absolute inset-0 bg-black/65 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex items-center gap-2">
            <Link
              href={href}
              tabIndex={-1}
              aria-hidden="true"
              className="notch-sm flex h-10 w-10 items-center justify-center bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            </Link>
            <button
              className="focus-inset notch-sm flex h-10 w-10 items-center justify-center border border-white/30 bg-white/15 text-white hover:border-accent hover:text-accent transition-colors"
              aria-label={`Add ${title.title} to watchlist`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {title.content_tier === "premium" && (
            <Badge variant="premium">Premium</Badge>
          )}
          {!isMovie && <Badge variant="info">Series</Badge>}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <Link
          href={href}
          className="focus-inset chromatic font-display block text-sm text-text-primary hover:text-accent transition-colors line-clamp-1"
          {...title.$?.title}
        >
          {title.title}
        </Link>
        {/* Metadata reads as a terminal readout: mono, tabular figures so
            years and runtimes line up down a rail. */}
        <div className="flex items-center gap-2 mt-1 font-mono text-xs tabular-nums">
          <span className="text-text-secondary">
            {new Date(title.release_date).getFullYear()}
          </span>
          {runtime && (
            <span className="text-text-secondary">· {formatRuntime(runtime)}</span>
          )}
          <span className="flex items-center gap-0.5 text-accent ml-auto">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span aria-label={`Score: ${title.score} out of 100`}>{title.score}</span>
          </span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap font-mono text-xs uppercase tracking-wider">
          {title.genres.slice(0, 2).map((g) => (
            <span key={g.uid} className="text-text-disabled leading-none">
              {g.title}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
