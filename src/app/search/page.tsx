"use client";

import { useState, useDeferredValue, useEffect } from "react";
import { X } from "lucide-react";
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
        <h1 className="font-display text-3xl uppercase text-text-primary mb-6 text-center">
          Search Flixstack
        </h1>

        {/* Search input */}
        <div className="notch-sm relative border border-border-control bg-surface">
          <label htmlFor="search-input" className="sr-only">
            Search movies and TV shows
          </label>
          {/* Terminal prompt. Decorative — the input keeps its own label. */}
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-accent"
            aria-hidden="true"
          >
            &gt;
          </span>
          <input
            id="search-input"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, genres, cast…"
            // No focus outline on the input itself: the border lives on the
            // wrapper, whose `notch-sm:has(:focus-visible)` rule draws the inset
            // ring (an outline here would be clipped by the wrapper's clip-path).
            // caret-accent turns the *native* text cursor phosphor, which is a
            // real terminal caret rather than a decorative blinking block —
            // nothing extra to animate or gate.
            className="w-full h-14 pl-11 pr-12 bg-transparent font-mono text-base text-text-primary caret-accent placeholder:text-text-secondary focus-visible:outline-none"
            aria-label="Search movies and TV shows"
            aria-controls="search-results"
            aria-describedby="search-status"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="focus-inset absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-accent transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
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
            <div className="flex items-baseline gap-3 mb-5 flex-wrap">
              <span className="font-mono text-xs uppercase tracking-widest text-accent tabular-nums">
                [ {results.length} {results.length === 1 ? "match" : "matches"} ]
              </span>
              <h2 className="font-display text-lg uppercase text-text-primary">
                for &ldquo;{deferredQuery}&rdquo;
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
                      fullWidth
                    data-cs-entry={title.uid}
                    data-cs-content-type={title.content_type}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {hasQuery && results.length === 0 && (
          <div className="py-16 max-w-md mx-auto">
            <div className="notch scanlines relative border border-border-control bg-surface px-6 py-8 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-signal mb-3">
                No signal
              </p>
              <h2 className="font-display text-xl uppercase text-text-primary mb-2">
                Nothing for &ldquo;{deferredQuery}&rdquo;
              </h2>
              <p className="text-text-secondary">
                Try searching by title, genre, cast, or tags.
              </p>
            </div>
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
    </div>
  );
}
