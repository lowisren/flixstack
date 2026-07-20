#!/usr/bin/env node
// ============================================================
// Flixstack Asset Recovery
//
// The Contentstack asset binaries for this stack were lost. This script
// re-downloads every image from its ORIGINAL deterministic source (the Picsum
// seed URLs in scripts/upload-assets.ts) to a local folder, and writes a
// manifest mapping each file to the entry + field it belongs to — so the images
// can be re-uploaded and re-linked manually later.
//
// Pure source recovery: makes NO Contentstack calls. Output is local only.
//
// Usage: node scripts/download-assets.mjs [destDir]   (default: ./assets-backup)
// ============================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Deterministic seeded-image helpers — identical to scripts/upload-assets.ts and
// src/lib/mock-data.ts, so the URLs reproduce the exact originals.
const img = (id, w = 800, h = 450) => `https://picsum.photos/seed/fs${id}/${w}/${h}`;
const portrait = (id) => `https://picsum.photos/seed/person${id}/200/200`;

const GENRES = [
  { slug: "action", title: "Action", seed: 10 },
  { slug: "drama", title: "Drama", seed: 20 },
  { slug: "sci-fi", title: "Sci-Fi", seed: 30 },
  { slug: "comedy", title: "Comedy", seed: 40 },
  { slug: "documentary", title: "Documentary", seed: 50 },
  { slug: "thriller", title: "Thriller", seed: 60 },
];
const PEOPLE = [
  ["christopher-nolan", "Christopher Nolan", 1], ["leonardo-dicaprio", "Leonardo DiCaprio", 2],
  ["cillian-murphy", "Cillian Murphy", 3], ["kate-winslet", "Kate Winslet", 4],
  ["denis-villeneuve", "Denis Villeneuve", 5], ["timothee-chalamet", "Timothée Chalamet", 6],
  ["zendaya", "Zendaya", 7], ["vince-gilligan", "Vince Gilligan", 8],
  ["bryan-cranston", "Bryan Cranston", 9], ["aaron-paul", "Aaron Paul", 10],
  ["matt-duffer", "Matt Duffer", 11], ["millie-bobby-brown", "Millie Bobby Brown", 12],
  ["christopher-storer", "Christopher Storer", 13], ["jeremy-allen-white", "Jeremy Allen White", 14],
  ["ridley-scott", "Ridley Scott", 15],
].map(([slug, name, seed]) => ({ slug, name, seed }));
const MOVIES = [
  ["inception", "Inception", 101], ["the-dark-knight", "The Dark Knight", 102],
  ["interstellar", "Interstellar", 103], ["dune-part-one", "Dune: Part One", 104],
  ["dune-part-two", "Dune: Part Two", 105], ["the-godfather", "The Godfather", 106],
  ["parasite", "Parasite", 107], ["mad-max-fury-road", "Mad Max: Fury Road", 108],
  ["everything-everywhere-all-at-once", "Everything Everywhere All at Once", 109],
  ["top-gun-maverick", "Top Gun: Maverick", 110], ["oppenheimer", "Oppenheimer", 111],
  ["the-matrix", "The Matrix", 112], ["john-wick", "John Wick", 113],
  ["the-grand-budapest-hotel", "The Grand Budapest Hotel", 114], ["knives-out", "Knives Out", 115],
  ["the-social-network", "The Social Network", 116], ["get-out", "Get Out", 117],
  ["blade-runner-2049", "Blade Runner 2049", 118], ["arrival", "Arrival", 119],
  ["the-shawshank-redemption", "The Shawshank Redemption", 120],
].map(([slug, title, seed]) => ({ slug, title, seed }));
const TV_SERIES = [
  ["breaking-bad", "Breaking Bad", 201], ["stranger-things", "Stranger Things", 202],
  ["the-bear", "The Bear", 203],
].map(([slug, title, seed]) => ({ slug, title, seed }));
const EPISODES = [
  ["pilot", "Breaking Bad – Pilot", 211], ["cats-in-the-bag", "Breaking Bad – Cat's in the Bag", 212],
  ["and-the-bags-in-the-river", "Breaking Bad – ...And the Bag's in the River", 213],
  ["seven-thirty-seven", "Breaking Bad – Seven Thirty-Seven", 214], ["grilled", "Breaking Bad – Grilled", 215],
  ["bit-by-a-dead-bee", "Breaking Bad – Bit by a Dead Bee", 216],
  ["the-vanishing-of-will-byers", "Stranger Things – The Vanishing of Will Byers", 221],
  ["the-weirdo-on-maple-street", "Stranger Things – The Weirdo on Maple Street", 222],
  ["holly-jolly", "Stranger Things – Holly, Jolly", 223], ["madmax", "Stranger Things – MADMAX", 224],
  ["trick-or-treat-freak", "Stranger Things – Trick or Treat, Freak", 225],
  ["the-pollywog", "Stranger Things – The Pollywog", 226],
  ["system", "The Bear – System", 231], ["hands", "The Bear – Hands", 232],
  ["brigade", "The Bear – Brigade", 233], ["beef", "The Bear – Beef", 234],
  ["pasta", "The Bear – Pasta", 235], ["fish", "The Bear – Fish", 236],
].map(([slug, title, seed]) => ({ slug, title, seed }));
const HERO_BANNERS = [
  { title: "Dune: Part Two", seed: 105 }, { title: "The Bear", seed: 203 }, { title: "Oppenheimer", seed: 111 },
];

// Same asset-title -> filename slugification as upload-assets.ts (matches the
// filenames the images had in Contentstack).
const safeName = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// TARGETS: every image placement (content type, entry match, field, source URL).
const TARGETS = [
  ...GENRES.map((g) => ({ contentTypeUid: "genre", matchField: "slug", matchValue: g.slug, fieldUid: "hero_image", url: img(g.seed), assetTitle: `Genre: ${g.title} – Hero` })),
  ...PEOPLE.map((p) => ({ contentTypeUid: "person", matchField: "slug", matchValue: p.slug, fieldUid: "photo", url: portrait(p.seed), assetTitle: `Person: ${p.name} – Photo` })),
  ...MOVIES.flatMap((m) => [
    { contentTypeUid: "movie", matchField: "slug", matchValue: m.slug, fieldUid: "artwork.hero_image", url: img(m.seed, 1920, 800), assetTitle: `Movie: ${m.title} – Hero` },
    { contentTypeUid: "movie", matchField: "slug", matchValue: m.slug, fieldUid: "artwork.thumbnail", url: img(m.seed), assetTitle: `Movie: ${m.title} – Thumbnail` },
  ]),
  ...TV_SERIES.flatMap((s) => [
    { contentTypeUid: "tv_series", matchField: "slug", matchValue: s.slug, fieldUid: "artwork.hero_image", url: img(s.seed, 1920, 800), assetTitle: `TV Series: ${s.title} – Hero` },
    { contentTypeUid: "tv_series", matchField: "slug", matchValue: s.slug, fieldUid: "artwork.thumbnail", url: img(s.seed), assetTitle: `TV Series: ${s.title} – Thumbnail` },
  ]),
  ...EPISODES.map((e) => ({ contentTypeUid: "episode", matchField: "slug", matchValue: e.slug, fieldUid: "thumbnail", url: img(e.seed), assetTitle: `Episode: ${e.title} – Thumbnail` })),
  ...HERO_BANNERS.map((h) => ({ contentTypeUid: "hero_banner", matchField: "title", matchValue: h.title, fieldUid: "background_image", url: img(h.seed, 1920, 800), assetTitle: `Hero Banner: ${h.title} – Background` })),
];

const destDir = process.argv[2] || join(process.cwd(), "assets-backup");

// One file per unique URL. The canonical file keeps the FIRST target's title/type
// (matches how upload-assets.ts cached by URL: movie/series hero wins over the
// hero_banner that reuses it), so filenames line up with the originals.
const byUrl = new Map();
for (const t of TARGETS) if (!byUrl.has(t.url)) byUrl.set(t.url, t);

async function download(url, filePath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(filePath, buf);
  return buf.length;
}

async function run() {
  console.log(`\nRecovering ${byUrl.size} unique images (${TARGETS.length} placements) -> ${destDir}\n`);
  const fileByUrl = new Map();
  let ok = 0, fail = 0;

  for (const t of byUrl.values()) {
    const rel = join(t.contentTypeUid, `${safeName(t.assetTitle)}.jpg`);
    const abs = join(destDir, rel);
    mkdirSync(join(destDir, t.contentTypeUid), { recursive: true });
    try {
      const bytes = await download(t.url, abs);
      fileByUrl.set(t.url, { rel, bytes });
      ok++;
      console.log(`  ✓ ${rel} (${bytes} bytes)`);
    } catch (err) {
      fail++;
      console.error(`  ✗ ${rel}: ${err.message}`);
    }
  }

  // Manifest: every placement, pointing at its canonical local file.
  const placements = TARGETS.map((t) => {
    const f = fileByUrl.get(t.url);
    return {
      file: f?.rel ?? null,
      bytes: f?.bytes ?? null,
      original_filename: `${safeName(byUrl.get(t.url).assetTitle)}.jpg`,
      asset_title: byUrl.get(t.url).assetTitle,
      source_url: t.url,
      target: { content_type: t.contentTypeUid, match_field: t.matchField, match_value: t.matchValue, field: t.fieldUid },
    };
  });
  writeFileSync(join(destDir, "manifest.json"), JSON.stringify({ generated_from: "picsum seeds (scripts/upload-assets.ts)", unique_files: byUrl.size, placements }, null, 2) + "\n");

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["file", "bytes", "asset_title", "source_url", "content_type", "match_field", "match_value", "field"].join(",")];
  for (const p of placements) rows.push([p.file, p.bytes, p.asset_title, p.source_url, p.target.content_type, p.target.match_field, p.target.match_value, p.target.field].map(esc).join(","));
  writeFileSync(join(destDir, "manifest.csv"), rows.join("\n") + "\n");

  console.log(`\nDone: ${ok} files downloaded, ${fail} failed. Manifest: ${TARGETS.length} placements -> ${byUrl.size} files.`);
  if (fail) process.exit(1);
}

run().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
