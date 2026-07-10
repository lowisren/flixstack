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
  "data-cs-entry"?: string;
  "data-cs-content-type"?: string;
}

export function TitleCard({
  title,
  layout = "landscape",
  ...props
}: TitleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const href = `/watch/${title.slug}`;
  const isMovie = title.content_type === "movie";
  const runtime = isMovie ? (title as Movie).runtime : null;

  return (
    <article
      className="group relative flex-shrink-0 rounded-lg overflow-hidden bg-[var(--color-bg-elevated)] transition-transform duration-200 hover:scale-105 hover:z-10 focus-within:scale-105 focus-within:z-10"
      style={{ width: layout === "portrait" ? "160px" : "280px" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-cs-entry={props["data-cs-entry"]}
      data-cs-content-type={props["data-cs-content-type"]}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--color-bg-elevated)]",
          layout === "portrait" ? "aspect-[2/3]" : "aspect-video"
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
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-elevated)]">
            <Play className="h-8 w-8 text-[var(--color-text-disabled)]" aria-hidden="true" />
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <Link
              href={href}
              tabIndex={-1}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] transition-colors"
              aria-label={`Play ${title.title}`}
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            </Link>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
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
          {!isMovie && (
            <Badge variant="default">Series</Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <Link
          href={href}
          className="block font-semibold text-sm text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors line-clamp-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
          {...title.$?.title}
        >
          {title.title}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {new Date(title.release_date).getFullYear()}
          </span>
          {runtime && (
            <span className="text-xs text-[var(--color-text-secondary)]">
              · {formatRuntime(runtime)}
            </span>
          )}
          <span className="flex items-center gap-0.5 text-xs text-[var(--color-accent)] ml-auto">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span aria-label={`Score: ${title.score} out of 100`}>{title.score}</span>
          </span>
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {title.genres.slice(0, 2).map((g) => (
            <span
              key={g.uid}
              className="text-xs text-[var(--color-text-disabled)] leading-none"
            >
              {g.title}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
