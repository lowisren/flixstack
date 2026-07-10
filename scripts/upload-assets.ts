#!/usr/bin/env ts-node
// ============================================================
// Flixstack Asset Upload Script
// Downloads the Picsum placeholder images already referenced in
// src/lib/mock-data.ts, uploads each one to the Contentstack Assets
// library, then links the resulting asset to the matching entry's
// image field (hero_image, thumbnail, photo, background_image).
//
// Usage:
//   pnpm upload-assets
//
// Prerequisites:
//   - CONTENTSTACK_MANAGEMENT_TOKEN in .env.local
//   - NEXT_PUBLIC_CONTENTSTACK_API_KEY in .env.local
//   - The content types + seeded entries from `pnpm seed` (or the
//     Claude Code session that seeded this stack) must already exist.
//
// Safe to re-run: assets are looked up by title before uploading, so
// a second run reuses existing assets instead of duplicating them.
// ============================================================

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import * as contentstack from "@contentstack/management";

const { api_key, management_token } = {
  api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY,
  management_token: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
};

if (!api_key || !management_token) {
  console.error("❌  Missing CONTENTSTACK_MANAGEMENT_TOKEN or NEXT_PUBLIC_CONTENTSTACK_API_KEY in .env.local");
  process.exit(1);
}

const client = contentstack.client();
const stack = client.stack({ api_key, management_token });

const TMP_DIR = path.join(__dirname, ".tmp-assets");

// Same deterministic seeded-image helpers as src/lib/mock-data.ts, so the
// URLs here match exactly what the mock data (and the seeded entries) used.
const img = (id: number, w = 800, h = 450) => `https://picsum.photos/seed/fs${id}/${w}/${h}`;
const portrait = (id: number) => `https://picsum.photos/seed/person${id}/200/200`;

const GENRES = [
  { slug: "action", title: "Action", seed: 10 },
  { slug: "drama", title: "Drama", seed: 20 },
  { slug: "sci-fi", title: "Sci-Fi", seed: 30 },
  { slug: "comedy", title: "Comedy", seed: 40 },
  { slug: "documentary", title: "Documentary", seed: 50 },
  { slug: "thriller", title: "Thriller", seed: 60 },
];

const PEOPLE = [
  { slug: "christopher-nolan", name: "Christopher Nolan", seed: 1 },
  { slug: "leonardo-dicaprio", name: "Leonardo DiCaprio", seed: 2 },
  { slug: "cillian-murphy", name: "Cillian Murphy", seed: 3 },
  { slug: "kate-winslet", name: "Kate Winslet", seed: 4 },
  { slug: "denis-villeneuve", name: "Denis Villeneuve", seed: 5 },
  { slug: "timothee-chalamet", name: "Timothée Chalamet", seed: 6 },
  { slug: "zendaya", name: "Zendaya", seed: 7 },
  { slug: "vince-gilligan", name: "Vince Gilligan", seed: 8 },
  { slug: "bryan-cranston", name: "Bryan Cranston", seed: 9 },
  { slug: "aaron-paul", name: "Aaron Paul", seed: 10 },
  { slug: "matt-duffer", name: "Matt Duffer", seed: 11 },
  { slug: "millie-bobby-brown", name: "Millie Bobby Brown", seed: 12 },
  { slug: "christopher-storer", name: "Christopher Storer", seed: 13 },
  { slug: "jeremy-allen-white", name: "Jeremy Allen White", seed: 14 },
  { slug: "ridley-scott", name: "Ridley Scott", seed: 15 },
];

const MOVIES = [
  { slug: "inception", title: "Inception", seed: 101 },
  { slug: "the-dark-knight", title: "The Dark Knight", seed: 102 },
  { slug: "interstellar", title: "Interstellar", seed: 103 },
  { slug: "dune-part-one", title: "Dune: Part One", seed: 104 },
  { slug: "dune-part-two", title: "Dune: Part Two", seed: 105 },
  { slug: "the-godfather", title: "The Godfather", seed: 106 },
  { slug: "parasite", title: "Parasite", seed: 107 },
  { slug: "mad-max-fury-road", title: "Mad Max: Fury Road", seed: 108 },
  { slug: "everything-everywhere-all-at-once", title: "Everything Everywhere All at Once", seed: 109 },
  { slug: "top-gun-maverick", title: "Top Gun: Maverick", seed: 110 },
  { slug: "oppenheimer", title: "Oppenheimer", seed: 111 },
  { slug: "the-matrix", title: "The Matrix", seed: 112 },
  { slug: "john-wick", title: "John Wick", seed: 113 },
  { slug: "the-grand-budapest-hotel", title: "The Grand Budapest Hotel", seed: 114 },
  { slug: "knives-out", title: "Knives Out", seed: 115 },
  { slug: "the-social-network", title: "The Social Network", seed: 116 },
  { slug: "get-out", title: "Get Out", seed: 117 },
  { slug: "blade-runner-2049", title: "Blade Runner 2049", seed: 118 },
  { slug: "arrival", title: "Arrival", seed: 119 },
  { slug: "the-shawshank-redemption", title: "The Shawshank Redemption", seed: 120 },
];

const TV_SERIES = [
  { slug: "breaking-bad", title: "Breaking Bad", seed: 201 },
  { slug: "stranger-things", title: "Stranger Things", seed: 202 },
  { slug: "the-bear", title: "The Bear", seed: 203 },
];

const EPISODES = [
  { slug: "pilot", title: "Breaking Bad – Pilot", seed: 211 },
  { slug: "cats-in-the-bag", title: "Breaking Bad – Cat's in the Bag", seed: 212 },
  { slug: "and-the-bags-in-the-river", title: "Breaking Bad – ...And the Bag's in the River", seed: 213 },
  { slug: "seven-thirty-seven", title: "Breaking Bad – Seven Thirty-Seven", seed: 214 },
  { slug: "grilled", title: "Breaking Bad – Grilled", seed: 215 },
  { slug: "bit-by-a-dead-bee", title: "Breaking Bad – Bit by a Dead Bee", seed: 216 },
  { slug: "the-vanishing-of-will-byers", title: "Stranger Things – The Vanishing of Will Byers", seed: 221 },
  { slug: "the-weirdo-on-maple-street", title: "Stranger Things – The Weirdo on Maple Street", seed: 222 },
  { slug: "holly-jolly", title: "Stranger Things – Holly, Jolly", seed: 223 },
  { slug: "madmax", title: "Stranger Things – MADMAX", seed: 224 },
  { slug: "trick-or-treat-freak", title: "Stranger Things – Trick or Treat, Freak", seed: 225 },
  { slug: "the-pollywog", title: "Stranger Things – The Pollywog", seed: 226 },
  { slug: "system", title: "The Bear – System", seed: 231 },
  { slug: "hands", title: "The Bear – Hands", seed: 232 },
  { slug: "brigade", title: "The Bear – Brigade", seed: 233 },
  { slug: "beef", title: "The Bear – Beef", seed: 234 },
  { slug: "pasta", title: "The Bear – Pasta", seed: 235 },
  { slug: "fish", title: "The Bear – Fish", seed: 236 },
];

// hero_banner has no slug field, so these are matched by title instead.
// Seeds intentionally reuse the linked movie/series's hero seed, so the
// asset cache (keyed by URL) uploads each image once and reuses it here.
const HERO_BANNERS = [
  { title: "Dune: Part Two", seed: 105 },
  { title: "The Bear", seed: 203 },
  { title: "Oppenheimer", seed: 111 },
];

interface ImageTarget {
  contentTypeUid: string;
  matchField: "slug" | "title";
  matchValue: string;
  fieldUid: string;
  url: string;
  assetTitle: string;
}

const TARGETS: ImageTarget[] = [
  ...GENRES.map((g): ImageTarget => ({
    contentTypeUid: "genre",
    matchField: "slug",
    matchValue: g.slug,
    fieldUid: "hero_image",
    url: img(g.seed),
    assetTitle: `Genre: ${g.title} – Hero`,
  })),
  ...PEOPLE.map((p): ImageTarget => ({
    contentTypeUid: "person",
    matchField: "slug",
    matchValue: p.slug,
    fieldUid: "photo",
    url: portrait(p.seed),
    assetTitle: `Person: ${p.name} – Photo`,
  })),
  ...MOVIES.flatMap((m): ImageTarget[] => [
    { contentTypeUid: "movie", matchField: "slug", matchValue: m.slug, fieldUid: "hero_image", url: img(m.seed, 1920, 800), assetTitle: `Movie: ${m.title} – Hero` },
    { contentTypeUid: "movie", matchField: "slug", matchValue: m.slug, fieldUid: "thumbnail", url: img(m.seed), assetTitle: `Movie: ${m.title} – Thumbnail` },
  ]),
  ...TV_SERIES.flatMap((s): ImageTarget[] => [
    { contentTypeUid: "tv_series", matchField: "slug", matchValue: s.slug, fieldUid: "hero_image", url: img(s.seed, 1920, 800), assetTitle: `TV Series: ${s.title} – Hero` },
    { contentTypeUid: "tv_series", matchField: "slug", matchValue: s.slug, fieldUid: "thumbnail", url: img(s.seed), assetTitle: `TV Series: ${s.title} – Thumbnail` },
  ]),
  ...EPISODES.map((e): ImageTarget => ({
    contentTypeUid: "episode",
    matchField: "slug",
    matchValue: e.slug,
    fieldUid: "thumbnail",
    url: img(e.seed),
    assetTitle: `Episode: ${e.title} – Thumbnail`,
  })),
  ...HERO_BANNERS.map((h): ImageTarget => ({
    contentTypeUid: "hero_banner",
    matchField: "title",
    matchValue: h.title,
    fieldUid: "background_image",
    url: img(h.seed, 1920, 800),
    assetTitle: `Hero Banner: ${h.title} – Background`,
  })),
];

async function downloadImage(url: string, assetTitle: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const safeName = assetTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filePath = path.join(TMP_DIR, `${safeName}.jpg`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function findOrCreateAsset(url: string, assetTitle: string): Promise<{ uid: string; reused: boolean }> {
  const existing: any = await stack.asset().query({ query: { title: assetTitle } }).find();
  const items = existing?.items ?? [];
  if (items.length > 0) {
    return { uid: items[0].uid, reused: true };
  }

  const localPath = await downloadImage(url, assetTitle);
  const asset: any = await stack.asset().create({ upload: localPath, title: assetTitle } as any);
  return { uid: asset.uid, reused: false };
}

async function findEntryUid(contentTypeUid: string, field: string, value: string): Promise<string | null> {
  const result: any = await stack.contentType(contentTypeUid).entry().query({ query: { [field]: value } }).find();
  const items = result?.items ?? [];
  return items[0]?.uid ?? null;
}

async function run() {
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const grouped = new Map<string, { contentTypeUid: string; matchField: string; matchValue: string; fields: { fieldUid: string; url: string }[] }>();
  for (const t of TARGETS) {
    const key = `${t.contentTypeUid}::${t.matchField}::${t.matchValue}`;
    if (!grouped.has(key)) {
      grouped.set(key, { contentTypeUid: t.contentTypeUid, matchField: t.matchField, matchValue: t.matchValue, fields: [] });
    }
    grouped.get(key)!.fields.push({ fieldUid: t.fieldUid, url: t.url });
  }

  console.log(`\n🖼️   Flixstack Asset Upload\n`);
  console.log(`${TARGETS.length} image fields across ${grouped.size} entries. Uploading…\n`);

  const assetCache = new Map<string, string>();
  let uploaded = 0;
  let reused = 0;
  let updated = 0;
  let failed = 0;

  for (const group of grouped.values()) {
    try {
      const entryUid = await findEntryUid(group.contentTypeUid, group.matchField, group.matchValue);
      if (!entryUid) {
        console.error(`  ✗ No ${group.contentTypeUid} entry found where ${group.matchField} = "${group.matchValue}"`);
        failed++;
        continue;
      }

      const entry: any = await stack.contentType(group.contentTypeUid).entry(entryUid).fetch();

      for (const field of group.fields) {
        let assetUid = assetCache.get(field.url);
        if (!assetUid) {
          const target = TARGETS.find((t) => t.url === field.url)!;
          const result = await findOrCreateAsset(field.url, target.assetTitle);
          assetUid = result.uid;
          assetCache.set(field.url, assetUid);
          result.reused ? reused++ : uploaded++;
        }
        entry[field.fieldUid] = assetUid;
      }

      await entry.update();
      updated++;
      console.log(`  ✓ ${group.contentTypeUid} / ${group.matchValue}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${group.contentTypeUid} / ${group.matchValue}: ${msg}`);
    }
  }

  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\n✅  Done.`);
  console.log(`   ${uploaded} new assets uploaded, ${reused} existing assets reused.`);
  console.log(`   ${updated} entries updated, ${failed} failures.\n`);

  if (failed > 0) {
    console.log("Some items failed — re-run the script; it's safe to run multiple times (existing assets are reused, not duplicated).\n");
  }
}

run().catch((err) => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  console.error("❌  Upload script failed:", err);
  process.exit(1);
});
