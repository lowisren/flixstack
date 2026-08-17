"use client";

import { useState, useMemo } from "react";
import { TitleCard } from "@/components/streaming/title-card";
import type { Genre, Movie, TvSeries } from "@/lib/types";
import { Filter, Grid } from "lucide-react";
import { cn } from "@/lib/utils";

type ContentFilter = "all" | "movie" | "tv_series";
type SortOption = "score" | "date" | "title";

interface BrowseClientProps {
  titles: (Movie | TvSeries)[];
  genres: Genre[];
  /** Page heading, sourced from the CMS `page` entry when present. */
  heading?: string;
}

export function BrowseClient({ titles, genres, heading }: BrowseClientProps) {
  const [typeFilter, setTypeFilter] = useState<ContentFilter>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("score");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let results: (Movie | TvSeries)[] = [...titles];

    if (typeFilter !== "all") {
      results = results.filter((t) => t.content_type === typeFilter);
    }
    if (genreFilter !== "all") {
      results = results.filter((t) => t.genres.some((g) => g.slug === genreFilter));
    }
    if (tierFilter !== "all") {
      results = results.filter((t) => t.content_tier === tierFilter);
    }

    results.sort((a, b) => {
      if (sort === "score") return b.score - a.score;
      if (sort === "date") return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
      if (sort === "title") return a.title.localeCompare(b.title);
      return 0;
    });

    return results;
  }, [titles, typeFilter, genreFilter, sort, tierFilter]);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl uppercase text-text-primary mb-2">
          {heading ?? "Browse All Titles"}
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-accent tabular-nums">
          [ {filtered.length} title{filtered.length !== 1 ? "s" : ""} available ]
        </p>
      </div>

      {/* Genre pills */}
      <section aria-label="Filter by genre" className="mb-6">
        <h2 className="sr-only">Genres</h2>
        <div className="flex gap-2 flex-wrap" id="genres">
          <button
            onClick={() => setGenreFilter("all")}
            className={cn(
              "notch-sm border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
              genreFilter === "all"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border-control bg-elevated text-text-secondary hover:border-accent hover:text-accent"
            )}
            aria-pressed={genreFilter === "all"}
          >
            All Genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre.uid}
              onClick={() => setGenreFilter(genre.slug)}
              className={cn(
                "notch-sm border px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors",
                genreFilter === genre.slug
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border-control bg-elevated text-text-secondary hover:border-accent hover:text-accent"
              )}
              aria-pressed={genreFilter === genre.slug}
            >
              {genre.title}
            </button>
          ))}
        </div>
      </section>

      {/* Filter bar */}
      <div
        className="flex flex-wrap gap-3 items-center mb-8 pb-6 border-b border-border"
        role="group"
        aria-label="Filter and sort controls"
      >
        <Filter className="h-4 w-4 text-text-secondary" aria-hidden="true" />

        {/* Type filter */}
        <div className="flex items-center gap-1 border border-border bg-elevated p-1" role="radiogroup" aria-label="Content type">
          {(["all", "movie", "tv_series"] as ContentFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              role="radio"
              aria-checked={typeFilter === type}
              className={cn(
                "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                typeFilter === type
                  ? "bg-surface text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-1 border border-border bg-elevated p-1" role="radiogroup" aria-label="Content tier">
          {["all", "free", "premium"].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              role="radio"
              aria-checked={tierFilter === tier}
              className={cn(
                "px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors",
                tierFilter === tier
                  ? "bg-surface text-accent"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {tier === "all" ? "All Tiers" : tier}
            </button>
          ))}
        </div>

        {/* Sort */}
        <label className="flex items-center gap-2 ml-auto text-sm">
          <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="border border-border-control bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-text-primary"
            aria-label="Sort titles by"
          >
            <option value="score">Top Rated</option>
            <option value="date">Newest First</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      {/* Results grid */}
      {filtered.length > 0 ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          role="list"
          aria-label={`${filtered.length} titles`}
        >
          {filtered.map((title) => (
            <div key={title.uid} role="listitem">
              <TitleCard
                title={title}
                layout="landscape"
                fullWidth
                data-cs-entry={title.uid}
                data-cs-content-type={title.content_type}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="notch scanlines relative mx-auto max-w-md border border-border-control bg-surface flex flex-col items-center justify-center py-16 px-6 text-center">
          <Grid className="h-10 w-10 text-text-disabled mb-4" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-signal mb-2">
            No signal
          </p>
          <h2 className="font-display text-lg uppercase text-text-primary mb-2">
            No titles found
          </h2>
          <p className="text-text-secondary mb-4">
            Try adjusting your filters.
          </p>
          <button
            onClick={() => { setTypeFilter("all"); setGenreFilter("all"); setTierFilter("all"); }}
            className="focus-inset font-mono text-xs uppercase tracking-wider text-accent hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
