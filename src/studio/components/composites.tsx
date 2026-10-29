"use client";

// Composites: registered whole, deliberately. Their value is behaviour (carousel
// rotation, scroll controls, the card's hover states), which can't be rebuilt from
// atoms on the canvas, so each takes a list or an entry bound from a reference
// field and renders the production component as-is (docs/studio-plan.md §5c).
//
// Raw Delivery API entries arrive from Studio; the app's normalizers turn them
// into the design system's types and attach edit tags for each entry, so a title
// or banner inside a rail stays clickable in Visual Editor.

import { isStudioCanvas } from "@contentstack/studio-react";
import { Hero, Rail, TitleCard, TitleGrid } from "@/design-system";
import { normalizeHeroBanner, normalizeTitle } from "@/lib/contentstack/normalize";
import type { HomepageRail, Movie, Title, TvSeries } from "@/lib/types";
import { choice, clone, entries, type Cslptag, type StudioAttributes } from "../props";

type Choice<T extends string> = T | T[];

function titles(value: unknown): Title[] {
  return entries(value).map((e) => normalizeTitle(clone(e)));
}

/**
 * Shown in Studio when nothing is bound yet, in place of an empty box. Visitors
 * get nothing: an unfilled field simply omits its section. (`isStudioCanvas` is
 * false on the server and for visitors, so server and client agree.)
 */
function Unbound({ what }: { what: string }) {
  if (!isStudioCanvas()) return null;
  return (
    <p className="border border-dashed border-border-control px-4 py-8 text-center font-mono text-xs uppercase tracking-wider text-text-secondary">
      Bind {what} to show content here
    </p>
  );
}

// ── Hero carousel ──────────────────────────────────────────────────────

export interface StudioHeroCarouselProps extends StudioAttributes {
  /** Hero banner entries (a reference field to `hero_banner`). */
  banners?: unknown;
}

export function StudioHeroCarousel({ banners, studioAttributes }: StudioHeroCarouselProps) {
  const list = entries(banners).map((b) => normalizeHeroBanner(clone(b)));
  return <div {...studioAttributes}>{list.length ? <Hero banners={list} /> : <Unbound what="hero banners" />}</div>;
}

// ── Title rail ─────────────────────────────────────────────────────────

export interface StudioTitleRailProps extends StudioAttributes {
  title?: string;
  /** Movie and series entries (a reference field to `movie` / `tv_series`). */
  items?: unknown;
  layout?: Choice<"landscape" | "portrait">;
  $title?: Cslptag;
}

export function StudioTitleRail({ title = "", items, layout, $title, studioAttributes }: StudioTitleRailProps) {
  const list = titles(items);
  const rail: HomepageRail = {
    uid: "studio-rail",
    title,
    rail_type: "editorial",
    items: list,
    layout: choice(layout, "landscape"),
    $: $title ? { title: $title } : undefined,
  };
  return <div {...studioAttributes}>{list.length ? <Rail rail={rail} /> : <Unbound what="titles" />}</div>;
}

// ── Title grid ─────────────────────────────────────────────────────────

export interface StudioTitleGridProps extends StudioAttributes {
  items?: unknown;
  columns?: Choice<"landscape-4" | "portrait-4" | "portrait-5" | "portrait-6">;
  /** Accessible name for the list, e.g. "Horror picks". */
  label?: string;
}

export function StudioTitleGrid({ items, columns, label, studioAttributes }: StudioTitleGridProps) {
  const list = titles(items);
  return (
    <div {...studioAttributes}>
      {list.length ? <TitleGrid titles={list} columns={choice(columns, "portrait-5")} label={label} /> : <Unbound what="titles" />}
    </div>
  );
}

// ── Title card ─────────────────────────────────────────────────────────

export interface StudioTitleCardProps extends StudioAttributes {
  /** One movie or series (a single reference field). */
  title?: unknown;
  layout?: Choice<"landscape" | "portrait">;
}

export function StudioTitleCard({ title, layout, studioAttributes }: StudioTitleCardProps) {
  const [entry] = titles(title);
  return (
    <div {...studioAttributes}>
      {entry ? <TitleCard title={entry as Movie | TvSeries} layout={choice(layout, "portrait")} fullWidth /> : <Unbound what="a title" />}
    </div>
  );
}
