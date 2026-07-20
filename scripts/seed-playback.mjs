#!/usr/bin/env node
// ============================================================
// Flixstack — seed sample playback video URLs on movies + episodes
//
// Demo/dev helper. Sets `playback.video_url` on every movie and episode
// (cycling through Google's public sample MP4 bucket) and publishes each to
// the configured environment, so /watch/[slug] pages are playable end-to-end.
//
// Idempotent: skips any entry that already has a playback.video_url unless you
// pass --force.  Run AFTER scripts/add-playback-field.mjs.
//
//   node scripts/seed-playback.mjs [--force]
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY,
// NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT. Optional MIGRATE_BRANCH (default "main").
// ============================================================

import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const ENV = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || "development";
const BRANCH = process.env.MIGRATE_BRANCH || "main";
const BASE = "https://api.contentstack.io/v3";
const FORCE = process.argv.includes("--force");

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN");
  process.exit(1);
}

// Public, stable sample MP4s (Google gtv-videos-bucket) — varied so the demo
// isn't the same clip everywhere.
const SAMPLES = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

async function cma(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { api_key: API_KEY, authorization: MGMT, "Content-Type": "application/json", branch: BRANCH },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const SYS = ["uid", "_version", "_in_progress", "created_at", "updated_at", "created_by",
  "updated_by", "ACL", "_metadata", "publish_details", "stackHeaders", "_owner", "_content_type_uid", "urlPath"];
const clean = (entry) => Object.fromEntries(Object.entries(entry).filter(([k]) => !SYS.includes(k)));

async function getEntries(ct) {
  const r = await cma("GET", `/content_types/${ct}/entries?limit=200`);
  return r.entries || [];
}

async function seed(ct) {
  const entries = await getEntries(ct);
  let updated = 0, skipped = 0, i = 0;
  for (const e of entries) {
    if (!FORCE && e.playback?.video_url) { skipped++; i++; continue; }
    const body = clean(e);
    body.playback = { ...(body.playback || {}), video_url: SAMPLES[i % SAMPLES.length] };
    await cma("PUT", `/content_types/${ct}/entries/${e.uid}`, { entry: body });
    await cma("POST", `/content_types/${ct}/entries/${e.uid}/publish`, {
      entry: { environments: [ENV], locales: ["en-us"] },
    });
    updated++; i++;
  }
  console.log(`  ${ct}: updated+published ${updated}, skipped(existing) ${skipped}, total ${entries.length}`);
}

async function main() {
  console.log(`Branch: ${BRANCH} | Environment: ${ENV}${FORCE ? " | --force" : ""}`);
  await seed("movie");
  await seed("episode");
  console.log("Done.");
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
