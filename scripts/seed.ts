#!/usr/bin/env tsx
// ============================================================
// Flixstack Contentstack Seed Script
//
// Creates the full demo catalogue in an empty stack, straight from
// src/lib/mock-data.ts (the single source of truth this shares with
// scripts/upload-assets.ts, so every seeded entry has a matching asset).
//
//   6  genre          15 person         20 movie
//   3  tv_series      18 episode        6  seasons (modular blocks)
//   3  hero_banner    5  homepage_rail
//   4  navigation     1  header         1  footer      1  site_config
//
// Usage (alias: `pnpm seed`):
//   tsx scripts/seed.ts [--dry] [--update] [--publish]
//     --dry     : read + print planned writes, make NO writes
//     --update  : entries that already exist are merged + PUT
//                 (default is skip — see the note on PUT below)
//     --publish : publish each entry to NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT
//                 as it is written (default is draft-only)
//
// Requires .env.local (override with ENV_FILE=.env.new):
//   NEXT_PUBLIC_CONTENTSTACK_API_KEY, CONTENTSTACK_MANAGEMENT_TOKEN
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION, _BRANCH, _ENVIRONMENT.
//
// Idempotent: every entry is matched on a natural key (slug, or title
// where the content type has no slug) before writing.
//
// NOTE ON --update: a CMA PUT *replaces* the entry, so any field absent
// from the payload is cleared — that is exactly how scripts/seed-playback.mjs
// nulled every artwork reference (see scripts/relink-artwork.mjs). This
// script therefore fetches the live entry and merges its fields under the
// seed payload, so asset links and playback config survive a re-run.
// ============================================================

import * as path from "path";
import * as dotenv from "dotenv";

// .env.local by default; set ENV_FILE (absolute, or relative to the directory you
// run from — the repo root, via `pnpm seed`) to target a different stack.
dotenv.config({ path: path.resolve(process.env.ENV_FILE ?? ".env.local") });

import {
  GENRES,
  PEOPLE,
  MOVIES,
  TV_SERIES,
  HERO_BANNERS,
  HOMEPAGE_RAILS,
} from "../src/lib/mock-data";

// ─── env ─────────────────────────────────────────────────────
const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT ?? "development";
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION ?? "US").toUpperCase();
const BRANCH = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH ?? "main";
const LOCALE = "en-us";

const DRY = process.argv.includes("--dry") || process.env.DRY === "1";
const UPDATE = process.argv.includes("--update");
const PUBLISH = process.argv.includes("--publish");

if (!API_KEY || !MGMT) {
  console.error(
    "Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN in .env.local"
  );
  process.exit(1);
}

const CMA_HOST_MAP: Record<string, string> = {
  US: "api.contentstack.io",
  EU: "eu-api.contentstack.com",
  AU: "au-api.contentstack.com",
  AZURE_NA: "azure-na-api.contentstack.com",
  AZURE_EU: "azure-eu-api.contentstack.com",
  GCP_NA: "gcp-na-api.contentstack.com",
  GCP_EU: "gcp-eu-api.contentstack.com",
};
const BASE = `https://${CMA_HOST_MAP[REGION] ?? CMA_HOST_MAP.US}/v3`;

const TAXONOMY_UID = "content_tags";

// ─── CMA helper ──────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Same term-uid derivation as scripts/migrate-v2.mjs, so uids line up. */
const termUid = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

async function cma(
  method: string,
  path: string,
  body?: unknown,
  { taxonomy = false }: { taxonomy?: boolean } = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const headers: Record<string, string> = {
    api_key: API_KEY as string,
    authorization: MGMT as string,
    "Content-Type": "application/json",
  };
  // taxonomy endpoints are stack-level (no branch header); everything else is branch-scoped.
  if (!taxonomy) headers.branch = BRANCH;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
}

// ─── entry registry (mock uid -> live uid) ───────────────────
const live = new Map<string, { uid: string; ct: string }>();

const ref = (mockUid: string) => {
  const hit = live.get(mockUid);
  return hit ? [{ uid: hit.uid, _content_type_uid: hit.ct }] : [];
};
const refs = (mockUids: string[]) => mockUids.flatMap(ref);

/** Contentstack rejects explicit nulls on some field types — drop empties instead. */
const prune = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))
  );

// ─── taxonomy preflight ──────────────────────────────────────
let TERMS: Set<string> | null = null;

async function loadTerms() {
  try {
    const res = await cma("GET", `/taxonomies/${TAXONOMY_UID}/terms?limit=100`, undefined, {
      taxonomy: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TERMS = new Set((res.terms ?? []).map((t: any) => t.uid));
    console.log(`  taxonomy ${TAXONOMY_UID}: ${TERMS.size} terms available`);
  } catch {
    TERMS = null;
    console.warn(
      `  ⚠  taxonomy "${TAXONOMY_UID}" not found — seeding without tag terms.\n` +
        `     Run \`node scripts/migrate-v2.mjs terms\` to create the taxonomy and its\n` +
        `     77-term vocabulary, then re-run this script with --update to backfill them.`
    );
  }
}

function taxonomiesFor(tags: string[]) {
  if (!TERMS) return undefined;
  const vals = tags
    .map(termUid)
    .filter((t) => TERMS!.has(t))
    .map((term_uid) => ({ taxonomy_uid: TAXONOMY_UID, term_uid }));
  return vals.length ? vals : undefined;
}

// ─── upsert ──────────────────────────────────────────────────
const stats = { created: 0, updated: 0, skipped: 0, published: 0, failed: 0 };

async function findEntry(ct: string, field: string, value: string): Promise<string | null> {
  const query = encodeURIComponent(JSON.stringify({ [field]: value }));
  const res = await cma("GET", `/content_types/${ct}/entries?query=${query}&limit=1`);
  return res.entries?.[0]?.uid ?? null;
}

async function upsert(
  ct: string,
  matchField: string,
  matchValue: string,
  fields: Record<string, unknown>,
  mockUid?: string
): Promise<string> {
  const label = `${ct}: ${fields.title ?? matchValue}`;
  const entry = prune(fields);

  try {
    const existing = DRY ? null : await findEntry(ct, matchField, matchValue);
    let uid: string;

    if (existing && !UPDATE) {
      uid = existing;
      stats.skipped++;
      console.log(`  · ${label} (exists)`);
    } else if (existing) {
      // Merge under the live entry so asset/playback fields survive the PUT.
      const current = await cma("GET", `/content_types/${ct}/entries/${existing}`);
      const merged = { ...current.entry, ...entry };
      await cma("PUT", `/content_types/${ct}/entries/${existing}`, { entry: merged });
      uid = existing;
      stats.updated++;
      console.log(`  ↻ ${label}`);
    } else if (DRY) {
      uid = `dry-${mockUid ?? matchValue}`;
      stats.created++;
      console.log(`  [dry] ${label}`);
    } else {
      const res = await cma("POST", `/content_types/${ct}/entries`, { entry });
      uid = res.entry.uid;
      stats.created++;
      console.log(`  ✓ ${label}`);
    }

    if (PUBLISH && !DRY) {
      await cma("POST", `/content_types/${ct}/entries/${uid}/publish`, {
        entry: { environments: [ENVIRONMENT], locales: [LOCALE] },
      });
      stats.published++;
    }

    if (mockUid) live.set(mockUid, { uid, ct });
    return uid;
  } catch (err) {
    stats.failed++;
    console.error(`  ✗ ${label}: ${err instanceof Error ? err.message : String(err)}`);
    return "";
  }
}

// ─── seed ────────────────────────────────────────────────────
async function seed() {
  console.log(
    `\n🎬 Flixstack seed  (region: ${REGION}, branch: ${BRANCH}, env: ${ENVIRONMENT}` +
      `${DRY ? ", DRY-RUN — no writes" : ""}${UPDATE ? ", UPDATE existing" : ""}` +
      `${PUBLISH ? ", PUBLISH on write" : ", draft only"})\n`
  );
  console.log(`Stack: ${API_KEY}\n`);

  await loadTerms();

  // ── Genres ──
  console.log("\nGenres…");
  for (const g of GENRES) {
    await upsert(
      "genre",
      "slug",
      g.slug,
      {
        title: g.title,
        slug: g.slug,
        url: `/genre/${g.slug}`, // matches the url_pattern in scripts/fix-url-patterns.mjs
        description: g.description,
        color_accent: g.color_accent,
      },
      g.uid
    );
  }

  // ── People ──
  console.log("\nPeople…");
  for (const p of PEOPLE) {
    await upsert(
      "person",
      "slug",
      p.slug,
      {
        title: p.name, // `person` has no `name` field — title is the display field
        slug: p.slug,
        url: `/person/${p.slug}`,
        bio: p.bio,
        role: [p.role], // multi-select in the v2 model
      },
      p.uid
    );
  }

  // ── Episodes (before tv_series, which references them) ──
  console.log("\nEpisodes…");
  for (const s of TV_SERIES) {
    for (const season of s.seasons) {
      for (const e of season.episodes) {
        await upsert(
          "episode",
          "slug",
          e.slug,
          {
            title: e.title,
            slug: e.slug,
            episode_number: e.episode_number,
            duration: e.duration,
            synopsis: e.synopsis,
            air_date: e.air_date,
          },
          e.uid
        );
      }
    }
  }

  // ── Movies ──
  console.log("\nMovies…");
  for (const m of MOVIES) {
    await upsert(
      "movie",
      "slug",
      m.slug,
      {
        title: m.title,
        slug: m.slug,
        url: `/watch/${m.slug}`,
        synopsis: m.synopsis,
        runtime: m.runtime,
        genres: refs(m.genres.map((g) => g.uid)),
        cast: refs(m.cast.map((c) => c.uid)),
        director: ref(m.director.uid),
        trailer_url: m.trailer_url,
        // v2 model: shared scalars live in the `title_metadata` global field.
        title_metadata: {
          rating: m.rating,
          content_tier: m.content_tier,
          release_date: m.release_date,
          score: m.score,
        },
        taxonomies: taxonomiesFor(m.tags),
      },
      m.uid
    );
  }

  // ── TV series ──
  console.log("\nTV series…");
  for (const s of TV_SERIES) {
    await upsert(
      "tv_series",
      "slug",
      s.slug,
      {
        title: s.title,
        slug: s.slug,
        url: `/watch/${s.slug}`,
        synopsis: s.synopsis,
        genres: refs(s.genres.map((g) => g.uid)),
        cast: refs(s.cast.map((c) => c.uid)),
        creator: ref(s.creator.uid),
        status: s.status,
        seasons: s.seasons.map((season) => ({
          season_block: {
            season_number: season.season_number,
            release_date: season.release_date,
            episodes: refs(season.episodes.map((e) => e.uid)),
          },
        })),
        title_metadata: {
          rating: s.rating,
          content_tier: s.content_tier,
          release_date: s.release_date,
          score: s.score,
        },
        taxonomies: taxonomiesFor(s.tags),
      },
      s.uid
    );
  }

  // ── Hero banners ──
  console.log("\nHero banners…");
  for (const b of HERO_BANNERS) {
    await upsert(
      "hero_banner",
      "title",
      b.title,
      {
        title: b.title,
        subtitle: b.subtitle,
        // v2 model: CTA is the reusable `cta` global field
        cta: { label: b.cta_label, url: b.cta_url, style: "primary", open_in_new_tab: false },
        badge_text: b.badge_text,
        linked_title: b.linked_title ? ref(b.linked_title.uid) : undefined,
      },
      b.uid
    );
  }

  // ── Homepage rails ──
  console.log("\nHomepage rails…");
  for (const r of HOMEPAGE_RAILS) {
    await upsert(
      "homepage_rail",
      "title",
      r.title,
      {
        title: r.title,
        rail_type: r.rail_type,
        items: refs(r.items.map((i) => i.uid)),
        layout: r.layout,
      },
      r.uid
    );
  }

  // ── Navigation / header / footer ──
  console.log("\nNavigation, header, footer…");

  const NAVS = [
    {
      key: "nav-main",
      title: "Main Navigation",
      links: [
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: "Movies", href: "/browse?type=movie" },
        { label: "TV Shows", href: "/browse?type=tv_series" },
      ],
    },
    {
      key: "nav-footer-browse",
      title: "Footer - Browse",
      links: [
        { label: "All Titles", href: "/browse" },
        { label: "Movies", href: "/browse?type=movie" },
        { label: "TV Shows", href: "/browse?type=tv_series" },
        { label: "Genres", href: "/browse#genres" },
      ],
    },
    {
      key: "nav-footer-account",
      title: "Footer - Account",
      links: [
        { label: "My Profile", href: "/profile" },
        { label: "Watchlist", href: "/profile#watchlist" },
        { label: "Watch History", href: "/profile#history" },
      ],
    },
    {
      key: "nav-footer-developer",
      title: "Footer - Developer",
      links: [
        { label: "Setup Guide", href: "/setup" },
        { label: "Content Models", href: "/setup#content-models" },
        { label: "Personalization", href: "/setup#personalization" },
        { label: "Automations", href: "/setup#automations" },
      ],
    },
  ];

  for (const nav of NAVS) {
    await upsert(
      "navigation",
      "title",
      nav.title,
      {
        title: nav.title,
        // v2 model: `links` is the reusable `link` global field (multiple)
        links: nav.links.map((l) => ({ ...l, open_in_new_tab: false })),
      },
      nav.key
    );
  }

  await upsert("header", "title", "Main Header", {
    title: "Main Header",
    main_navigation: ref("nav-main"),
    show_search: true,
    show_profile: true,
  });

  await upsert("footer", "title", "Main Footer", {
    title: "Main Footer",
    columns: [
      { heading: "Browse", links: ref("nav-footer-browse") },
      { heading: "Account", links: ref("nav-footer-account") },
      { heading: "Developer", links: ref("nav-footer-developer") },
    ],
    legal_text: `© ${new Date().getFullYear()} Flixstack. All rights reserved.`,
  });

  await upsert("site_config", "title", "Flixstack Config", {
    title: "Flixstack Config",
    site_name: "Flixstack",
    // v2 model: feature_flags is a group[] of { key, enabled }
    feature_flags: [
      { key: "dev_mode", enabled: true },
      { key: "lytics_enabled", enabled: false },
    ],
  });

  // ── Summary ──
  console.log(
    `\n${stats.failed ? "⚠" : "✅"}  created ${stats.created}, updated ${stats.updated}, ` +
      `skipped ${stats.skipped}, published ${stats.published}, failed ${stats.failed}\n`
  );

  if (!DRY && !stats.failed) {
    console.log("Next steps:");
    console.log("  1. pnpm upload-assets        # images, linked to these entries");
    console.log("  2. pnpm customize-fields     # editor experience");
    console.log("  3. tsx scripts/seed.ts --publish --update   # publish once assets are linked\n");
  }

  if (stats.failed) process.exitCode = 1;
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});
