#!/usr/bin/env node
// ============================================================
// Flixstack — upload artwork from assets-backup/ and link it to entries
//
// Driven entirely by assets-backup/manifest.json: 85 files, 88 placements
// (three images are reused across hero banners). Each placement names the
// entry to match and the field path to set, including nested global-field
// paths like `artwork.hero_image`.
//
// Supersedes scripts/upload-assets.ts, which re-downloaded the images from
// Picsum and wrote v1 field paths (top-level `hero_image` on movie/tv_series);
// those fields moved into the `artwork` global field in the v2 model, so the
// writes silently went nowhere.
//
// Idempotent: assets are matched by title before upload, and an entry field
// that already points at the right asset is left alone.
//
// Usage (alias: `npm run upload-assets`):
//   node scripts/upload-assets.mjs [--dry] [--force]
//     --dry   : read + print planned writes, make NO writes
//     --force : overwrite image fields that already have an asset
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Override the env file with ENV_FILE=.env.other (repo-root-relative or absolute).
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION and NEXT_PUBLIC_CONTENTSTACK_BRANCH.
// ============================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// .env.local by default; set ENV_FILE (repo-root-relative, or absolute) to point
// this script at a different stack without swapping the file on disk.
const ENV_FILE = resolve(ROOT, process.env.ENV_FILE ?? ".env.local");

for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "US").toUpperCase();
const BRANCH = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || "main";
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN in .env.local");
  process.exit(1);
}

const CMA_HOST_MAP = {
  US: "api.contentstack.io", EU: "eu-api.contentstack.com", AU: "au-api.contentstack.com",
  AZURE_NA: "azure-na-api.contentstack.com", AZURE_EU: "azure-eu-api.contentstack.com",
  GCP_NA: "gcp-na-api.contentstack.com", GCP_EU: "gcp-eu-api.contentstack.com",
};
const BASE = `https://${CMA_HOST_MAP[REGION] ?? CMA_HOST_MAP.US}/v3`;

const MANIFEST = JSON.parse(readFileSync(resolve(ROOT, "assets-backup/manifest.json"), "utf8"));

// ---- CMA helpers -------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const authHeaders = () => ({ api_key: API_KEY, authorization: MGMT, branch: BRANCH });

async function cma(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(500 * 2 ** attempt); continue; }
    const err = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
}

// Asset creation is multipart, so it can't go through cma() — and the boundary
// has to come from fetch, which means no explicit Content-Type here.
async function uploadAsset(relPath, title) {
  const buf = readFileSync(resolve(ROOT, "assets-backup", relPath));
  const filename = relPath.split("/").pop();
  const fd = new FormData();
  fd.append("asset[upload]", new Blob([buf], { type: "image/jpeg" }), filename);
  fd.append("asset[title]", title);
  fd.append("asset[description]", title); // a11y default; content-governance can refine

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}/assets`, { method: "POST", headers: authHeaders(), body: fd });
    const text = await res.text();
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (res.ok) return json.asset.uid;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(500 * 2 ** attempt); continue; }
    throw new Error(`upload ${relPath} -> ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  }
}

async function findAssetByTitle(title) {
  const q = encodeURIComponent(JSON.stringify({ title }));
  const r = await cma("GET", `/assets?query=${q}&limit=1`);
  return r.assets?.[0]?.uid ?? null;
}

async function findEntry(ct, field, value) {
  const q = encodeURIComponent(JSON.stringify({ [field]: value }));
  const r = await cma("GET", `/content_types/${ct}/entries?query=${q}&limit=1`);
  return r.entries?.[0]?.uid ?? null;
}

// ---- entry payload handling --------------------------------
const SYS = ["uid", "_version", "_in_progress", "created_at", "updated_at", "created_by",
  "updated_by", "ACL", "_metadata", "publish_details", "stackHeaders", "_owner",
  "_content_type_uid", "urlPath", "_branch"];
const clean = (entry) => Object.fromEntries(Object.entries(entry).filter(([k]) => !SYS.includes(k)));

// A CMA entry PUT replaces the whole entry, so the payload has to carry every
// field intact. File fields read back as populated objects but must be written
// as a bare asset uid — collapse them, or the round-trip drops the reference.
// (This is the bug that nulled every artwork ref once already; see
// scripts/relink-artwork.mjs.)
function collapseAssets(value) {
  if (Array.isArray(value)) return value.map(collapseAssets);
  if (value && typeof value === "object") {
    if (typeof value.uid === "string" && "filename" in value && "content_type" in value && "url" in value) {
      return value.uid;
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, collapseAssets(v)]));
  }
  return value;
}

const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
function setPath(obj, path, val) {
  const keys = path.split(".");
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[keys.at(-1)] = val;
}

// ---- main --------------------------------------------------
(async () => {
  console.log(
    `\n🖼  Flixstack asset upload  (region: ${REGION}, branch: ${BRANCH}` +
      `${DRY ? ", DRY-RUN — no writes" : ""}${FORCE ? ", FORCE overwrite" : ""})`
  );
  console.log(`Stack: ${API_KEY}`);
  console.log(`${MANIFEST.placements.length} placements across ${MANIFEST.unique_files} files\n`);

  // group placements by target entry
  const groups = new Map();
  for (const p of MANIFEST.placements) {
    const k = `${p.target.content_type}::${p.target.match_field}::${p.target.match_value}`;
    if (!groups.has(k)) groups.set(k, { ...p.target, fields: [] });
    groups.get(k).fields.push({ path: p.target.field, file: p.file, title: p.asset_title });
  }

  const assetUids = new Map(); // asset_title -> uid
  let uploaded = 0, reused = 0, linked = 0, untouched = 0, failed = 0;

  for (const g of groups.values()) {
    try {
      const entryUid = await findEntry(g.content_type, g.match_field, g.match_value);
      if (!entryUid) {
        console.error(`  ✗ no ${g.content_type} where ${g.match_field}="${g.match_value}"`);
        failed++;
        continue;
      }

      const full = clean((await cma("GET", `/content_types/${g.content_type}/entries/${entryUid}`)).entry);
      const body = collapseAssets(full);
      const changes = [];

      for (const f of g.fields) {
        const current = getPath(body, f.path);
        if (current && !FORCE) { untouched++; continue; }

        let uid = assetUids.get(f.title);
        if (!uid) {
          uid = await findAssetByTitle(f.title);
          if (uid) { reused++; }
          else if (DRY) { uid = `dry-${f.title}`; uploaded++; }
          else { uid = await uploadAsset(f.file, f.title); uploaded++; }
          assetUids.set(f.title, uid);
        }
        setPath(body, f.path, uid);
        changes.push(f.path);
      }

      if (!changes.length) {
        console.log(`  · ${g.content_type}/${g.match_value} (already linked)`);
        continue;
      }
      if (!DRY) await cma("PUT", `/content_types/${g.content_type}/entries/${entryUid}`, { entry: body });
      console.log(`  ${DRY ? "[dry]" : "✓"} ${g.content_type}/${g.match_value} → ${changes.join(", ")}`);
      linked++;
    } catch (err) {
      console.error(`  ✗ ${g.content_type}/${g.match_value}: ${err.message}`);
      failed++;
    }
  }

  console.log(
    `\n${failed ? "⚠" : "✅"}  assets: ${uploaded} uploaded, ${reused} reused | ` +
      `entries: ${linked} linked, ${untouched} fields already set, ${failed} failed\n`
  );
  if (failed) process.exit(1);
})().catch((e) => { console.error("\n❌  Upload failed:", e.message); process.exit(1); });
