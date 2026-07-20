// ============================================================
// ContentStack Data Fetchers
// Every function creates a fresh Stack per call (see client.ts) and,
// when a `livePreview` param is supplied (forwarded from a page's
// searchParams via `parseLivePreviewParams`), queries draft content
// through the Preview API instead of the published Delivery API.
// ============================================================

import type { LivePreviewQuery } from "@contentstack/delivery-sdk";
import { createStack } from "./client";
import {
  normalizeFooter,
  normalizeGenre,
  normalizeHeader,
  normalizeHeroBanner,
  normalizeHomepageRail,
  normalizeMovie,
  normalizeNavigation,
  normalizePageMeta,
  normalizePromoBlock,
  normalizeSetupGuide,
  normalizeSiteConfig,
  normalizeTvSeries,
} from "./normalize";
import { SETUP_GUIDE_FALLBACK } from "../setup-fallback";
import type {
  Footer,
  Genre,
  Header,
  HeroBanner,
  HomepageRail,
  ModularBlock,
  Movie,
  Navigation,
  Page,
  SetupGuide,
  SiteConfig,
  Title,
  TvSeries,
} from "../types";

const MOVIE_REFERENCES = ["genres", "cast", "director"];
const TV_SERIES_REFERENCES = ["genres", "cast", "creator", "seasons.season_block.episodes"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawEntry = Record<string, any>;

function stack(livePreview?: LivePreviewQuery) {
  const s = createStack();
  if (livePreview) s.livePreviewQuery(livePreview);
  return s;
}

/** Reads the `live_preview`/`entry_uid`/`content_type_uid` query params Contentstack's
 * preview iframe appends to every request, per its documented SSR contract. */
export function parseLivePreviewParams(
  searchParams: Record<string, string | string[] | undefined>
): LivePreviewQuery | undefined {
  const live_preview = searchParams.live_preview;
  if (!live_preview || Array.isArray(live_preview)) return undefined;
  const contentTypeUid = searchParams.content_type_uid;
  const entryUid = searchParams.entry_uid;
  return {
    live_preview,
    contentTypeUid: typeof contentTypeUid === "string" ? contentTypeUid : undefined,
    entryUid: typeof entryUid === "string" ? entryUid : undefined,
  };
}

export async function getAllMovies(livePreview?: LivePreviewQuery): Promise<Movie[]> {
  const result = await stack(livePreview)
    .contentType("movie")
    .entry()
    .includeReference(...MOVIE_REFERENCES)
    .query()
    .find<RawEntry>();
  return (result.entries ?? []).map(normalizeMovie);
}

export async function getAllSeries(livePreview?: LivePreviewQuery): Promise<TvSeries[]> {
  const result = await stack(livePreview)
    .contentType("tv_series")
    .entry()
    .includeReference(...TV_SERIES_REFERENCES)
    .query()
    .find<RawEntry>();
  return (result.entries ?? []).map(normalizeTvSeries);
}

export async function getAllTitles(livePreview?: LivePreviewQuery): Promise<Title[]> {
  const [movies, series] = await Promise.all([getAllMovies(livePreview), getAllSeries(livePreview)]);
  return [...movies, ...series];
}

export async function getTitleBySlug(slug: string, livePreview?: LivePreviewQuery): Promise<Title | undefined> {
  // Look up by the `slug` field (the route param) rather than reconstructing the
  // `url` field — the two diverged once entry urls moved to /watch/:slug for Visual
  // Builder, and slug is the stable natural key for this route.
  const [movieResult, seriesResult] = await Promise.all([
    stack(livePreview)
      .contentType("movie")
      .entry()
      .includeReference(...MOVIE_REFERENCES)
      .query()
      .equalTo("slug", slug)
      .find<RawEntry>(),
    stack(livePreview)
      .contentType("tv_series")
      .entry()
      .includeReference(...TV_SERIES_REFERENCES)
      .query()
      .equalTo("slug", slug)
      .find<RawEntry>(),
  ]);
  const movie = movieResult.entries?.[0];
  if (movie) return normalizeMovie(movie);
  const series = seriesResult.entries?.[0];
  if (series) return normalizeTvSeries(series);
  return undefined;
}

export async function getAllGenres(livePreview?: LivePreviewQuery): Promise<Genre[]> {
  const result = await stack(livePreview).contentType("genre").entry().query().find<RawEntry>();
  return (result.entries ?? []).map(normalizeGenre);
}

export async function getGenreBySlug(slug: string, livePreview?: LivePreviewQuery): Promise<Genre | undefined> {
  const result = await stack(livePreview)
    .contentType("genre")
    .entry()
    .query()
    .equalTo("slug", slug)
    .find<RawEntry>();
  const genre = result.entries?.[0];
  return genre ? normalizeGenre(genre) : undefined;
}

export async function getTitlesByGenre(genreSlug: string, livePreview?: LivePreviewQuery): Promise<Title[]> {
  const all = await getAllTitles(livePreview);
  return all.filter((t) => t.genres.some((g) => g.slug === genreSlug));
}

export async function getHeroBanners(livePreview?: LivePreviewQuery): Promise<HeroBanner[]> {
  const result = await stack(livePreview)
    .contentType("hero_banner")
    .entry()
    .includeReference("linked_title")
    .query()
    .find<RawEntry>();
  return (result.entries ?? []).map(normalizeHeroBanner);
}

export async function getHomepageRails(livePreview?: LivePreviewQuery): Promise<HomepageRail[]> {
  const result = await stack(livePreview)
    .contentType("homepage_rail")
    .entry()
    .includeReference("items")
    .query()
    .find<RawEntry>();
  return (result.entries ?? []).map(normalizeHomepageRail);
}

export async function searchTitles(query: string, livePreview?: LivePreviewQuery): Promise<Title[]> {
  if (!query.trim()) return [];
  const [movieResult, seriesResult] = await Promise.all([
    stack(livePreview)
      .contentType("movie")
      .entry()
      .includeReference(...MOVIE_REFERENCES)
      .query()
      .search(query)
      .find<RawEntry>(),
    stack(livePreview)
      .contentType("tv_series")
      .entry()
      .includeReference(...TV_SERIES_REFERENCES)
      .query()
      .search(query)
      .find<RawEntry>(),
  ]);
  return [
    ...(movieResult.entries ?? []).map(normalizeMovie),
    ...(seriesResult.entries ?? []).map(normalizeTvSeries),
  ];
}

export async function getFeaturedTitles(livePreview?: LivePreviewQuery): Promise<Title[]> {
  const rails = await getHomepageRails(livePreview);
  return rails[0]?.items ?? [];
}

export async function getTrendingTitles(livePreview?: LivePreviewQuery): Promise<Title[]> {
  const all = await getAllTitles(livePreview);
  return [...all].sort((a, b) => b.score - a.score).slice(0, 10);
}

const DEFAULT_SITE_CONFIG: SiteConfig = {
  site_name: "Flixstack",
  feature_flags: {},
};

// The header/footer/site-config queries below are fetched in the root layout on every
// route. A thrown delivery error here (e.g. a misconfigured environment or an unreachable
// branch) would crash the layout and 500 the *entire* site, so they degrade to safe
// fallbacks and log instead of throwing. Page-level queries are left to fail per-route.
export async function getSiteConfig(livePreview?: LivePreviewQuery): Promise<SiteConfig> {
  try {
    const result = await stack(livePreview).contentType("site_config").entry().query().find<RawEntry>();
    const raw = result.entries?.[0];
    return raw ? normalizeSiteConfig(raw) : DEFAULT_SITE_CONFIG;
  } catch (err) {
    console.error("[contentstack] getSiteConfig failed, using default:", err);
    return DEFAULT_SITE_CONFIG;
  }
}

/** Fetches the `setup_guide` singleton that drives the /setup Developer Guide.
 * Degrades to a bundled fallback (same content) when the stack isn't configured
 * or a delivery error occurs, so /setup always renders. */
export async function getSetupGuide(livePreview?: LivePreviewQuery): Promise<SetupGuide> {
  try {
    const result = await stack(livePreview).contentType("setup_guide").entry().query().find<RawEntry>();
    const raw = result.entries?.[0];
    return raw ? normalizeSetupGuide(raw) : SETUP_GUIDE_FALLBACK;
  } catch (err) {
    console.error("[contentstack] getSetupGuide failed, using fallback:", err);
    return SETUP_GUIDE_FALLBACK;
  }
}

export async function getHeader(livePreview?: LivePreviewQuery): Promise<Header | undefined> {
  try {
    const result = await stack(livePreview)
      .contentType("header")
      .entry()
      .includeReference("main_navigation")
      .query()
      .find<RawEntry>();
    const raw = result.entries?.[0];
    return raw ? normalizeHeader(raw) : undefined;
  } catch (err) {
    console.error("[contentstack] getHeader failed:", err);
    return undefined;
  }
}

export async function getFooter(livePreview?: LivePreviewQuery): Promise<Footer | undefined> {
  try {
    const result = await stack(livePreview)
      .contentType("footer")
      .entry()
      .includeReference("columns.links")
      .query()
      .find<RawEntry>();
    const raw = result.entries?.[0];
    return raw ? normalizeFooter(raw) : undefined;
  } catch (err) {
    console.error("[contentstack] getFooter failed:", err);
    return undefined;
  }
}

export async function getNavigationByTitle(
  title: string,
  livePreview?: LivePreviewQuery
): Promise<Navigation | undefined> {
  const result = await stack(livePreview)
    .contentType("navigation")
    .entry()
    .query()
    .equalTo("title", title)
    .find<RawEntry>();
  const raw = result.entries?.[0];
  return raw ? normalizeNavigation(raw) : undefined;
}

/** Fetches a single homepage_rail entry by its known UID, with items (and their
 * genres) fully resolved — used to hydrate a `page`'s rail_block sections. */
export async function getHomepageRailByUid(
  uid: string,
  livePreview?: LivePreviewQuery
): Promise<HomepageRail | undefined> {
  try {
    const raw = await stack(livePreview)
      .contentType("homepage_rail")
      .entry(uid)
      .includeReference("items", "items.genres")
      .fetch<RawEntry>();
    return raw ? normalizeHomepageRail(raw) : undefined;
  } catch {
    return undefined;
  }
}

/** Fetches a CMS-composed landing page (e.g. /movie, /tv-show, /browse) by slug and
 * resolves its `sections`. Resolves `hero_block` (referenced hero_banners),
 * `promo_block` (inline block with a flattened cta), and `rail_block` (embedded
 * homepage_rail, fetched per-uid so its items resolve fully). `genre_spotlight_block`
 * is not resolved yet — no page uses it. */
export async function getPageBySlug(slug: string, livePreview?: LivePreviewQuery): Promise<Page | undefined> {
  const result = await stack(livePreview)
    .contentType("page")
    .entry()
    .includeReference(
      "sections.rail_block.rail",
      "sections.hero_block.hero_banners",
      "sections.hero_block.hero_banners.linked_title"
    )
    .query()
    .equalTo("slug", slug)
    .find<RawEntry>();
  const raw = result.entries?.[0];
  if (!raw) return undefined;

  const sections: ModularBlock[] = [];
  for (const block of raw.sections ?? []) {
    if (block.hero_block) {
      const banners = (block.hero_block.hero_banners ?? []).map(normalizeHeroBanner);
      if (banners.length) sections.push({ block_type: "hero_block", data: banners });
    } else if (block.rail_block?.rail?.[0]?.uid) {
      const rail = await getHomepageRailByUid(block.rail_block.rail[0].uid, livePreview);
      if (rail) sections.push({ block_type: "rail_block", data: rail });
    } else if (block.promo_block) {
      sections.push({ block_type: "promo_block", data: normalizePromoBlock(block.promo_block) });
    }
  }

  return normalizePageMeta(raw, sections);
}
