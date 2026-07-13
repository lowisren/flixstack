// ============================================================
// FLIXSTACK — Shared TypeScript Types
// These map 1:1 to ContentStack content types
// See: content-models/export.json for the full schema
// ============================================================

/** A Contentstack Asset (file field), as returned by the Delivery API. */
export interface Asset {
  uid: string;
  url: string;
  filename: string;
  title: string;
  content_type?: string;
  file_size?: string;
}

/** A single Visual Builder edit tag, spread onto a DOM element: `<h1 {...entry.$?.title}>`. */
export type CslpTag = { "data-cslp": string };

/** The `$` map that `addEditableTags` attaches to every normalized entry. */
export interface EditableTagMap {
  [fieldPath: string]: CslpTag | undefined;
}

export interface Genre {
  uid: string;
  title: string;
  slug: string;
  description: string;
  color_accent: string;
  hero_image?: Asset;
  $?: EditableTagMap;
}

export interface Person {
  uid: string;
  name: string;
  slug: string;
  bio: string;
  photo?: Asset;
  // Modeled in Contentstack as a multi-select — a person can hold more than one role.
  role: Array<"actor" | "director" | "producer" | "writer">;
  $?: EditableTagMap;
}

export interface Episode {
  uid: string;
  title: string;
  slug: string;
  episode_number: number;
  duration: number; // minutes
  synopsis: string;
  thumbnail?: Asset;
  air_date: string;
  $?: EditableTagMap;
}

export interface Season {
  uid: string;
  season_number: number;
  release_date: string;
  episodes: Episode[];
}

export interface Movie {
  uid: string;
  content_type: "movie";
  title: string;
  slug: string;
  synopsis: string;
  release_date: string;
  runtime: number; // minutes
  rating: string; // G, PG, PG-13, R
  genres: Genre[];
  cast: Person[];
  director: Person;
  hero_image?: Asset;
  thumbnail?: Asset;
  trailer_url?: string;
  content_tier: "free" | "premium";
  tags: string[];
  score: number; // 0-100 audience score
  $?: EditableTagMap;
}

export interface TvSeries {
  uid: string;
  content_type: "tv_series";
  title: string;
  slug: string;
  synopsis: string;
  release_date: string;
  rating: string;
  genres: Genre[];
  cast: Person[];
  creator: Person;
  hero_image?: Asset;
  thumbnail?: Asset;
  seasons: Season[];
  status: "ongoing" | "ended" | "upcoming";
  content_tier: "free" | "premium";
  tags: string[];
  score: number;
  $?: EditableTagMap;
}

export type Title = Movie | TvSeries;

export interface HeroBanner {
  uid: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_url: string;
  background_image?: Asset;
  badge_text?: string;
  linked_title?: Title;
  $?: EditableTagMap;
}

export interface HomepageRail {
  uid: string;
  title: string;
  rail_type: "editorial" | "automated";
  items: Title[];
  layout: "landscape" | "portrait" | "hero";
  $?: EditableTagMap;
}

// Modular block union
export type ModularBlock =
  | { block_type: "hero_block"; data: HeroBanner }
  | { block_type: "rail_block"; data: HomepageRail }
  | { block_type: "promo_block"; data: PromoBlock }
  | { block_type: "genre_spotlight_block"; data: GenreSpotlightBlock }

export interface PromoBlock {
  uid: string;
  headline: string;
  body: string;
  image?: Asset;
  cta_label: string;
  cta_url: string;
  layout: "left" | "right" | "center";
}

export interface GenreSpotlightBlock {
  uid: string;
  genre: Genre;
  items: Title[];
}

// A CMS-composed landing page (e.g. /movie, /tv-show)
export interface Page {
  uid: string;
  title: string;
  slug: string;
  url: string;
  sections: ModularBlock[];
  $?: EditableTagMap;
}

// Global fields
export interface SeoFields {
  meta_title: string;
  meta_description: string;
  og_image?: Asset;
  canonical_url?: string;
}

export interface SiteConfig {
  site_name: string;
  feature_flags: Record<string, boolean>;
  $?: EditableTagMap;
}

export interface NavLinkItem {
  label: string;
  href: string;
  open_in_new_tab?: boolean;
  $?: EditableTagMap;
}

// A reusable, ordered list of links (e.g. "Main Navigation", "Footer - Browse").
export interface Navigation {
  uid: string;
  title: string;
  links: NavLinkItem[];
  $?: EditableTagMap;
}

export interface Header {
  uid: string;
  logo?: Asset;
  main_navigation?: Navigation;
  cta_label?: string;
  cta_url?: string;
  show_search: boolean;
  show_profile: boolean;
  $?: EditableTagMap;
}

export interface FooterColumn {
  heading: string;
  links?: Navigation;
  $?: EditableTagMap;
}

export interface Footer {
  uid: string;
  columns: FooterColumn[];
  legal_text: string;
  $?: EditableTagMap;
}

// Lytics
export type LyticsSegment =
  | "action_fan"
  | "binge_watcher"
  | "new_user"
  | "premium_subscriber"
  | "lapsed_user"
  | "default";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscription_tier: "free" | "premium";
  watchlist: string[]; // title UIDs
  watch_history: string[]; // title UIDs
  preferences: {
    genres: string[];
    notifications: boolean;
    autoplay: boolean;
  };
  segments: LyticsSegment[];
}
