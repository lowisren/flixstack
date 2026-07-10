"use client";

// ============================================================
// Lytics CDP Integration
// Set NEXT_PUBLIC_LYTICS_ACCOUNT_ID in .env.local to enable.
// Without it, all tracking calls are no-ops and a default
// segment is returned.
// ============================================================

declare global {
  interface Window {
    jstag?: {
      send: (data: Record<string, unknown>) => void;
      getEntity: (field: string) => unknown;
    };
  }
}

export const LYTICS_ACCOUNT_ID = process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID ?? "";

export const isLyticsConfigured = Boolean(LYTICS_ACCOUNT_ID);

// Initialize Lytics jstag (called once in the root layout client component)
export function initLytics() {
  if (!isLyticsConfigured || typeof window === "undefined") return;
  if (window.jstag) return; // already loaded

  // Lytics jstag bootstrap snippet
  const script = document.createElement("script");
  script.src = `https://c.lytics.io/api/tag/${LYTICS_ACCOUNT_ID}/latest.min.js`;
  script.async = true;
  document.head.appendChild(script);
}

// Track a behavioral event
export function trackEvent(
  event: string,
  data: Record<string, unknown> = {}
) {
  if (!isLyticsConfigured || typeof window === "undefined") return;
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
