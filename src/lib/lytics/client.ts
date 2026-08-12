"use client";

// ============================================================
// Lytics CDP Integration
// The jstag tag itself is installed in the document head by
// <Lytics /> (src/components/analytics/lytics.tsx). This module
// only sends events through it. If the tag is absent, every
// tracking call is a no-op and a default segment is returned.
// ============================================================

declare global {
  interface Window {
    jstag?: {
      send: (data: Record<string, unknown>) => void;
      pageView: (data?: Record<string, unknown>) => void;
      getEntity: (field: string) => unknown;
    };
  }
}

// Track a behavioral event
export function trackEvent(
  event: string,
  data: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;
  // The tag stub queues calls made before the async library lands, so this only
  // misses events when the tag failed to load at all.
  window.jstag?.send({ event, ...data });
}

// Common event helpers
export const lyticsEvents = {
  titleView: (titleSlug: string, titleType: "movie" | "tv_series") =>
    trackEvent("title_view", { title_slug: titleSlug, content_type: titleType }),

  playbackStart: (titleSlug: string) =>
    trackEvent("playback_start", { title_slug: titleSlug }),

  playbackComplete: (titleSlug: string) =>
    trackEvent("playback_complete", { title_slug: titleSlug }),

  genreBrowse: (genreSlug: string) =>
    trackEvent("genre_browse", { genre_slug: genreSlug }),

  searchQuery: (query: string, resultCount: number) =>
    trackEvent("search_query", { query, result_count: resultCount }),

  watchlistAdd: (titleSlug: string) =>
    trackEvent("watchlist_add", { title_slug: titleSlug }),

  watchlistRemove: (titleSlug: string) =>
    trackEvent("watchlist_remove", { title_slug: titleSlug }),
};
