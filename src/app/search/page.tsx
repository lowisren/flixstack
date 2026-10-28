"use client";

import { useState, useDeferredValue, useEffect } from "react";
import { EmptyState, Heading, PageShell, Readout, SearchField, TitleGrid } from "@/design-system";
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
    <PageShell>
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-10">
        <Heading as="h1" size="3xl" className="mb-6 text-center">
          Search Flixstack
        </Heading>

        <SearchField
          id="search-input"
          value={query}
          onValueChange={setQuery}
          label="Search movies and TV shows"
          placeholder="Search movies, shows, genres, cast…"
          autoFocus
          aria-controls="search-results"
          aria-describedby="search-status"
        />

        {/* Status for screen readers */}
        <p id="search-status" className="sr-only" aria-live="polite" aria-atomic="true">
          {hasQuery
            ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${deferredQuery}"`
            : "Enter at least 2 characters to search"}
        </p>
      </div>

      {/* Results */}
      <div id="search-results" role="region" aria-label="Search results">
        {hasQuery && results.length > 0 && (
          <>
            <div className="flex items-baseline gap-3 mb-5 flex-wrap">
              <Readout as="span">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </Readout>
              <Heading as="h2" size="lg">
                for &ldquo;{deferredQuery}&rdquo;
              </Heading>
            </div>
            <TitleGrid titles={results} columns="portrait-6" />
          </>
        )}

        {hasQuery && results.length === 0 && (
          <div className="py-16 max-w-md mx-auto">
            <EmptyState
              title={<>Nothing for &ldquo;{deferredQuery}&rdquo;</>}
              titleSize="xl"
              description="Try searching by title, genre, cast, or tags."
              spacing="loose"
              className="px-6 py-8"
            />
          </div>
        )}

        {!hasQuery && (
          <div className="py-16 text-center">
            <p className="font-mono text-sm text-text-secondary terminal-caret">
              <span className="text-accent" aria-hidden="true">
                &gt;{" "}
              </span>
              awaiting query
            </p>
            <p className="text-sm mt-4 text-text-secondary max-w-md mx-auto">
              Search runs across every movie, TV show and genre, powered by
              Contentstack&rsquo;s Delivery API search capability.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
