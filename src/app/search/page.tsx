"use client";

import { useState, useDeferredValue, useEffect } from "react";
import { Search, X } from "lucide-react";
import { TitleCard } from "@/components/streaming/title-card";
import { lyticsEvents } from "@/lib/lytics/client";
import type { Movie, TvSeries } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<(Movie | TvSeries)[]>([]);

  useEffect(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { results: (Movie | TvSeries)[] }) => {
        setResults(data.results);
        lyticsEvents.searchQuery(trimmed, data.results.length);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setResults([]);
      });

    return () => controller.abort();
  }, [deferredQuery]);

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-6 text-center">
          Search Flixstack
        </h1>

        {/* Search input */}
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">
            Search movies and TV shows
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text-disabled)]"
            aria-hidden="true"
          />
          <input
            id="search-input"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, genres, cast…"
            className="w-full h-14 pl-12 pr-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] transition-colors"
            aria-label="Search movies and TV shows"
            aria-controls="search-results"
            aria-describedby="search-status"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[var(--color-bg-elevated)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Status for screen readers */}
        <p
          id="search-status"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {hasQuery
            ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${deferredQuery}"`
            : "Enter at least 2 characters to search"}
        </p>
      </div>

      {/* Results */}
      <div id="search-results" role="region" aria-label="Search results">
        {hasQuery && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{deferredQuery}&rdquo;
              </h2>
            </div>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              role="list"
            >
              {results.map((title) => (
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
          </>
        )}

        {hasQuery && results.length === 0 && (
          <div className="py-20 text-center max-w-md mx-auto">
            <Search className="h-12 w-12 text-[var(--color-text-disabled)] mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              No results for &ldquo;{deferredQuery}&rdquo;
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              Try searching by title, genre, cast, or tags.
            </p>
          </div>
        )}

        {!hasQuery && (
          <div className="py-16 text-center text-[var(--color-text-secondary)]">
            <p className="text-lg">
              Start typing to search across all movies, TV shows, and genres.
            </p>
            <p className="text-sm mt-2 text-[var(--color-text-disabled)]">
              Search is powered by ContentStack&rsquo;s Delivery API search capability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
