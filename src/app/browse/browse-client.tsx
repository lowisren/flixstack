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
}

export function BrowseClient({ titles, genres }: BrowseClientProps) {
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
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Browse All Titles
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {filtered.length} title{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Genre pills */}
      <section aria-label="Filter by genre" className="mb-6">
        <h2 className="sr-only">Genres</h2>
        <div className="flex gap-2 flex-wrap" id="genres">
          <button
            onClick={() => setGenreFilter("all")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]",
              genreFilter === "all"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]",
                genreFilter === genre.slug
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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
        className="flex flex-wrap gap-3 items-center mb-8 pb-6 border-b border-[var(--color-border)]"
        role="group"
        aria-label="Filter and sort controls"
      >
        <Filter className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-1" role="radiogroup" aria-label="Content type">
          {(["all", "movie", "tv_series"] as ContentFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              role="radio"
              aria-checked={typeFilter === type}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
                typeFilter === type
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {type === "all" ? "All" : type === "movie" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-1" role="radiogroup" aria-label="Content tier">
          {["all", "free", "premium"].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              role="radio"
              aria-checked={tierFilter === tier}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                "focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]",
                tierFilter === tier
                  ? "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
            >
              {tier === "all" ? "All Tiers" : tier}
            </button>
          ))}
        </div>

        {/* Sort */}
        <label className="flex items-center gap-2 ml-auto text-sm">
          <span className="text-[var(--color-text-secondary)]">Sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
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
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          role="list"
          aria-label={`${filtered.length} titles`}
        >
          {filtered.map((title) => (
            <div key={title.uid} role="listitem">
              <TitleCard
                title={title}
                layout="portrait"
                data-cs-entry={title.uid}
                data-cs-content-type={title.content_type}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Grid className="h-12 w-12 text-[var(--color-text-disabled)] mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            No titles found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Try adjusting your filters.
          </p>
          <button
            onClick={() => { setTypeFilter("all"); setGenreFilter("all"); setTierFilter("all"); }}
            className="text-[var(--color-accent)] hover:underline text-sm font-medium focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
