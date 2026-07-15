// ============================================================
// Maps raw Contentstack Delivery API entries into Flixstack's app types.
//
// Called once per entry, immediately after fetching (never inside components):
//   - Renders Advanced/JSON Rich Text fields (`synopsis`) to HTML.
//   - Flattens the structured-content model's nested shapes back into the app's
//     flat types, so components stay unchanged (see content-models/MIGRATION_STATUS.md):
//       · `title_metadata` global field  -> rating/content_tier/release_date/score
//       · `artwork` global field         -> hero_image/thumbnail
//       · `content_tags` taxonomy        -> `tags` (term UIDs mapped back to slugs)
//       · `cta` global field             -> cta_label/cta_url
//       · `feature_flags` group[]        -> Record<string, boolean>
//   - Unwraps single-reference fields (`director`, `creator`) which the
//     Delivery API still returns as a one-element array.
//   - Attaches `data-cslp` Visual Builder edit tags via `addEditableTags`,
//     including on nested referenced entries (genres/cast/director/etc.),
//     each tagged with its own content type UID.
// ============================================================

import { addEditableTags, jsonToHTML } from "@contentstack/utils";
import { LIVE_PREVIEW_ENABLED } from "./client";
import type {
  Episode,
  Footer,
  FooterColumn,
  Genre,
  Header,
  HeroBanner,
  HomepageRail,
  Movie,
  Navigation,
  NavLinkItem,
  Page,
  Person,
  Season,
  SetupDocLink,
  SetupFeature,
  SetupGuide,
  SetupLink,
  SetupStep,
  SiteConfig,
  Title,
  TvSeries,
} from "../types";

const LOCALE = "en-us";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function tag(entry: Raw, contentTypeUid: string): void {
  // Skip on production/live deployments — no `data-cslp` edit tags in the published markup.
  if (!LIVE_PREVIEW_ENABLED) return;
  if (!entry || typeof entry !== "object") return;
  addEditableTags(entry, contentTypeUid, true, LOCALE);
}

function renderRte(entry: Raw, paths: string[]): void {
  if (!entry) return;
  try {
    jsonToHTML({ entry, paths });
  } catch {
    // Field wasn't JSON RTE (e.g. already a plain string, or empty) — leave as-is.
  }
}

/** Maps a Contentstack taxonomy field (array of `{ taxonomy_uid, term_uid }`)
 * into the app's flat `tags: string[]`. Term UIDs are underscore-cased
 * (`mind_bending`); the app's tags use hyphenated slugs (`mind-bending`). */
function normalizeTags(taxonomies: Raw): string[] {
  if (!Array.isArray(taxonomies)) return [];
  return taxonomies
    .filter((t) => t?.taxonomy_uid === "content_tags" && t?.term_uid)
    .map((t) => String(t.term_uid).replace(/_/g, "-"));
}

export function normalizeGenre(raw: Raw): Genre {
  tag(raw, "genre");
  return {
    uid: raw.uid,
    title: raw.title,
    slug: raw.slug,
    description: raw.description ?? "",
    color_accent: raw.color_accent ?? "",
    hero_image: raw.hero_image ?? undefined,
    $: raw.$,
  };
}

export function normalizePerson(raw: Raw): Person {
  tag(raw, "person");
  return {
    uid: raw.uid,
    name: raw.title,
    slug: raw.slug,
    bio: raw.bio ?? "",
    photo: raw.photo ?? undefined,
    role: Array.isArray(raw.role) ? raw.role : raw.role ? [raw.role] : [],
    $: raw.$,
  };
}

export function normalizeEpisode(raw: Raw): Episode {
  renderRte(raw, ["synopsis"]);
  tag(raw, "episode");
  return {
    uid: raw.uid,
    title: raw.title,
    slug: raw.slug,
    episode_number: raw.episode_number,
    duration: raw.duration,
    synopsis: raw.synopsis ?? "",
    thumbnail: raw.thumbnail ?? undefined,
    air_date: raw.air_date,
    $: raw.$,
  };
}

function normalizeSeasons(raw: Raw[] | undefined): Season[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((block) => {
    const season = block.season_block ?? {};
    const episodes = Array.isArray(season.episodes) ? season.episodes.map(normalizeEpisode) : [];
    return {
      uid: block._metadata?.uid ?? `season-${season.season_number}`,
      season_number: season.season_number,
      release_date: season.release_date,
      episodes,
    };
  });
}

function normalizeReferenceArray<T>(raw: Raw, mapper: (r: Raw) => T): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapper);
}

function normalizeSingleReference<T>(raw: Raw, mapper: (r: Raw) => T): T | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw;
  return first ? mapper(first) : undefined;
}

export function normalizeMovie(raw: Raw): Movie {
  renderRte(raw, ["synopsis"]);
  tag(raw, "movie");
  const genres = normalizeReferenceArray(raw.genres, normalizeGenre);
  const cast = normalizeReferenceArray(raw.cast, normalizePerson);
  const director = normalizeSingleReference(raw.director, normalizePerson);
  const meta = raw.title_metadata ?? {};
  const art = raw.artwork ?? {};
  return {
    uid: raw.uid,
    content_type: "movie",
    title: raw.title,
    slug: raw.slug,
    synopsis: raw.synopsis ?? "",
    release_date: meta.release_date,
    runtime: raw.runtime,
    rating: meta.rating,
    genres,
    cast,
    director: director as Person,
    hero_image: art.hero_image ?? undefined,
    thumbnail: art.thumbnail ?? undefined,
    trailer_url: raw.trailer_url,
    content_tier: meta.content_tier,
    tags: normalizeTags(raw.taxonomies),
    score: meta.score,
    $: raw.$,
  };
}

export function normalizeTvSeries(raw: Raw): TvSeries {
  renderRte(raw, ["synopsis"]);
  tag(raw, "tv_series");
  const genres = normalizeReferenceArray(raw.genres, normalizeGenre);
  const cast = normalizeReferenceArray(raw.cast, normalizePerson);
  const creator = normalizeSingleReference(raw.creator, normalizePerson);
  const meta = raw.title_metadata ?? {};
  const art = raw.artwork ?? {};
  return {
    uid: raw.uid,
    content_type: "tv_series",
    title: raw.title,
    slug: raw.slug,
    synopsis: raw.synopsis ?? "",
    release_date: meta.release_date,
    rating: meta.rating,
    genres,
    cast,
    creator: creator as Person,
    hero_image: art.hero_image ?? undefined,
    thumbnail: art.thumbnail ?? undefined,
    seasons: normalizeSeasons(raw.seasons),
    status: raw.status,
    content_tier: meta.content_tier,
    tags: normalizeTags(raw.taxonomies),
    score: meta.score,
    $: raw.$,
  };
}

export function normalizeTitle(raw: Raw): Title {
  return raw._content_type_uid === "tv_series" || raw.seasons ? normalizeTvSeries(raw) : normalizeMovie(raw);
}

export function normalizeHeroBanner(raw: Raw): HeroBanner {
  tag(raw, "hero_banner");
  const linked = normalizeSingleReference(raw.linked_title, normalizeTitle);
  return {
    uid: raw.uid,
    title: raw.title,
    subtitle: raw.subtitle ?? "",
    cta_label: raw.cta?.label ?? "",
    cta_url: raw.cta?.url ?? "",
    background_image: raw.background_image ?? undefined,
    badge_text: raw.badge_text,
    linked_title: linked,
    $: raw.$,
  };
}

export function normalizeHomepageRail(raw: Raw): HomepageRail {
  tag(raw, "homepage_rail");
  return {
    uid: raw.uid,
    title: raw.title,
    rail_type: raw.rail_type,
    items: normalizeReferenceArray(raw.items, normalizeTitle),
    layout: raw.layout,
    $: raw.$,
  };
}

export function normalizeSiteConfig(raw: Raw): SiteConfig {
  tag(raw, "site_config");
  return {
    site_name: raw.site_name ?? "Flixstack",
    // Modeled as a group[] of { key, enabled }; flatten to the app's Record<string, boolean>.
    feature_flags: Array.isArray(raw.feature_flags)
      ? Object.fromEntries(raw.feature_flags.map((f: Raw) => [f.key, Boolean(f.enabled)]))
      : raw.feature_flags ?? {},
    $: raw.$,
  };
}

function normalizeNavLink(raw: Raw): NavLinkItem {
  return {
    label: raw.label ?? "",
    href: raw.href ?? "",
    open_in_new_tab: raw.open_in_new_tab ?? false,
    $: raw.$,
  };
}

export function normalizeNavigation(raw: Raw): Navigation {
  tag(raw, "navigation");
  return {
    uid: raw.uid,
    title: raw.title,
    links: (raw.links ?? []).map(normalizeNavLink),
    $: raw.$,
  };
}

export function normalizeHeader(raw: Raw): Header {
  tag(raw, "header");
  return {
    uid: raw.uid,
    logo: raw.logo ?? undefined,
    main_navigation: normalizeSingleReference(raw.main_navigation, normalizeNavigation),
    cta_label: raw.cta?.label ?? "",
    cta_url: raw.cta?.url ?? "",
    show_search: raw.show_search ?? true,
    show_profile: raw.show_profile ?? true,
    $: raw.$,
  };
}

function normalizeFooterColumn(raw: Raw): FooterColumn {
  return {
    heading: raw.heading ?? "",
    links: normalizeSingleReference(raw.links, normalizeNavigation),
    $: raw.$,
  };
}

export function normalizeFooter(raw: Raw): Footer {
  tag(raw, "footer");
  return {
    uid: raw.uid,
    columns: (raw.columns ?? []).map(normalizeFooterColumn),
    legal_text: raw.legal_text ?? "",
    $: raw.$,
  };
}

/** True when an RTE-rendered HTML string carries no visible text (e.g. an empty
 * JSON RTE paragraph renders to `<p></p>`) — treated as an absent optional field. */
function isEmptyHtml(html: unknown): boolean {
  return typeof html !== "string" || html.replace(/<[^>]*>/g, "").trim() === "";
}

/** Flattens a `link` global field; returns undefined when it carries no data. */
function normalizeSetupLink(raw: Raw): SetupLink | undefined {
  if (!raw || (!raw.label && !raw.href)) return undefined;
  return {
    label: raw.label ?? "",
    href: raw.href ?? "",
    open_in_new_tab: raw.open_in_new_tab ?? false,
  };
}

function normalizeSetupStep(raw: Raw): SetupStep {
  return {
    heading: raw.heading ?? "",
    description: raw.description ?? "",
    detail: isEmptyHtml(raw.detail) ? undefined : raw.detail,
    code: raw.code?.trim() ? raw.code : undefined,
    docs_link: normalizeSetupLink(raw.docs_link),
    $: raw.$,
  };
}

function normalizeSetupFeature(raw: Raw): SetupFeature {
  return {
    anchor_id: raw.anchor_id ?? "",
    icon: raw.icon ?? "",
    heading: raw.heading ?? "",
    description: raw.description ?? "",
    field_tags: Array.isArray(raw.field_tags) ? raw.field_tags : [],
    learn_link: normalizeSetupLink(raw.learn_link),
    $: raw.$,
  };
}

function normalizeSetupDocLink(raw: Raw): SetupDocLink {
  return {
    link: normalizeSetupLink(raw.link) ?? { label: "", href: "", open_in_new_tab: false },
    description: raw.description ?? "",
    $: raw.$,
  };
}

/** Normalizes the `setup_guide` singleton. Its prose fields are JSON RTE, so they
 * are rendered to HTML first (top-level and inside the `steps`/`features` groups)
 * before the flat, HTML-string-bearing app type is built. */
export function normalizeSetupGuide(raw: Raw): SetupGuide {
  renderRte(raw, [
    "intro",
    "features_intro",
    "steps.description",
    "steps.detail",
    "features.description",
  ]);
  tag(raw, "setup_guide");
  return {
    uid: raw.uid,
    title: raw.title ?? "",
    badge_label: raw.badge_label ?? "",
    intro: raw.intro ?? "",
    steps_heading: raw.steps_heading ?? "",
    steps: Array.isArray(raw.steps) ? raw.steps.map(normalizeSetupStep) : [],
    features_heading: raw.features_heading ?? "",
    features_intro: raw.features_intro ?? "",
    features: Array.isArray(raw.features) ? raw.features.map(normalizeSetupFeature) : [],
    docs_heading: raw.docs_heading ?? "",
    doc_links: Array.isArray(raw.doc_links) ? raw.doc_links.map(normalizeSetupDocLink) : [],
    $: raw.$,
  };
}

/** Normalizes only the page's own fields — `sections` requires resolving nested
 * modular-block references (e.g. rail_block -> homepage_rail -> items), which
 * needs additional async fetches, so callers build `sections` separately
 * (see `getPageBySlug` in queries.ts) and pass it in here. */
export function normalizePageMeta(raw: Raw, sections: Page["sections"]): Page {
  tag(raw, "page");
  return {
    uid: raw.uid,
    title: raw.title,
    slug: raw.slug,
    url: raw.url,
    sections,
    $: raw.$,
  };
}
