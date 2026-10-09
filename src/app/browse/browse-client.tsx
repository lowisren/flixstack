"use client";

import { useState, useMemo } from "react";
import { Grid } from "lucide-react";
import {
  EmptyState,
  FilterBar,
  Heading,
  PageShell,
  Readout,
  TitleGrid,
  ToggleChip,
  textLinkClasses,
  type ContentTypeFilter,
  type SortOption,
  type TierFilter,
} from "@/design-system";
import type { Genre, Movie, TvSeries } from "@/lib/types";

interface BrowseClientProps {
  titles: (Movie | TvSeries)[];
  genres: Genre[];
  /** Page heading, sourced from the CMS `page` entry when present. */
  heading?: string;
}

export function BrowseClient({ titles, genres, heading }: BrowseClientProps) {
  const [typeFilter, setTypeFilter] = useState<ContentTypeFilter>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("score");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

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
    <PageShell>
      {/* Page header */}
      <div className="mb-8">
        <Heading as="h1" size="3xl" className="mb-2">
          {heading ?? "Browse All Titles"}
        </Heading>
        <Readout>
          {filtered.length} title{filtered.length !== 1 ? "s" : ""} available
        </Readout>
      </div>

      {/* Genre pills */}
      <section aria-label="Filter by genre" className="mb-6">
        <h2 className="sr-only">Genres</h2>
        <div className="flex gap-2 flex-wrap" id="genres">
          <ToggleChip pressed={genreFilter === "all"} onClick={() => setGenreFilter("all")}>
            All Genres
          </ToggleChip>
          {genres.map((genre) => (
            <ToggleChip
              key={genre.uid}
              pressed={genreFilter === genre.slug}
              onClick={() => setGenreFilter(genre.slug)}
            >
              {genre.title}
            </ToggleChip>
          ))}
        </div>
      </section>

      <FilterBar
        type={typeFilter}
        onTypeChange={setTypeFilter}
        tier={tierFilter}
        onTierChange={setTierFilter}
        sort={sort}
        onSortChange={setSort}
      />

      {filtered.length > 0 ? (
        <TitleGrid titles={filtered} columns="landscape-4" label={`${filtered.length} titles`} />
      ) : (
        <EmptyState
          icon={Grid}
          title="No titles found"
          description="Try adjusting your filters."
          className="mx-auto max-w-md flex flex-col items-center justify-center py-16 px-6"
          action={
            <button
              type="button"
              onClick={() => { setTypeFilter("all"); setGenreFilter("all"); setTierFilter("all"); }}
              className={textLinkClasses.action}
            >
              Clear all filters
            </button>
          }
        />
      )}
    </PageShell>
  );
}
