#!/usr/bin/env node
// ============================================================
// Flixstack — Tier 3 (3.1a): content-type URL patterns + entry URLs
//
// Fixes Visual Builder "open in preview", which 404s today because page-type
// content types point at the wrong route:
//   movie/tv_series : url_pattern /:title  →  /watch/:slug  (+ rewrite entry urls)
//   genre           : not a page           →  is_page + /genre/:slug (+ url field + urls)
//   page            : url_pattern /:title  →  /:slug  (options only; entry urls are bespoke — untouched)
//
// person is intentionally excluded: it has no standalone route, and toggling
// is_page fights its existing url field. See docs/cms-editor-experience-tier3.md §3.1a.
//
// Idempotent & re-runnable. Phases:
//   patterns : update content-type options (+ add genre url field)
//   entries  : rewrite stored entry urls for movie / tv_series / genre
//   all      : patterns + entries   (default)
//   --dry    : read + print planned changes, write nothing
//
// Usage (alias: `pnpm fix-url-patterns <phase> [--dry]`):
//   node scripts/fix-url-patterns.mjs [patterns|entries|all] [--dry]
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION and NEXT_PUBLIC_CONTENTSTACK_BRANCH.
// ============================================================

import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "US").toUpperCase();
const BRANCH = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || "main";
const DRY = process.argv.includes("--dry") || process.env.DRY === "1";

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

async function cma(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { api_key: API_KEY, authorization: MGMT, branch: BRANCH, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status; err.body = json; throw err;
  }
  return json;
}

const getCT = async (uid) => (await cma("GET", `/content_types/${uid}`)).content_type;
async function putCT(ct) {
  if (DRY) return;
  const body = { content_type: { title: ct.title, uid: ct.uid, schema: ct.schema, options: ct.options, description: ct.description } };
  if (ct.field_rules) body.content_type.field_rules = ct.field_rules;
  await cma("PUT", `/content_types/${ct.uid}`, body);
}

// ---- config ------------------------------------------------
const CT_OPTIONS = {
  movie: { is_page: true, url_prefix: "/", url_pattern: "/watch/:slug" },
  tv_series: { is_page: true, url_prefix: "/", url_pattern: "/watch/:slug" },
  genre: { is_page: true, url_prefix: "/", url_pattern: "/genre/:slug" },
  page: { is_page: true, url_prefix: "/", url_pattern: "/:slug" },
};
// entry url = f(slug); only these content types get their stored urls rewritten.
const ENTRY_URL = {
  movie: (e) => `/watch/${e.slug}`,
  tv_series: (e) => `/watch/${e.slug}`,
  genre: (e) => `/genre/${e.slug}`,
};
// genre has no url field today; is_page types need one. Modelled on movie.url.
const urlField = () => ({
  display_name: "URL", uid: "url", data_type: "text", mandatory: false,
  field_metadata: { _default: true, version: 3 }, multiple: false, unique: false, non_localizable: true,
});

// ============================================================
// Phase: content-type options
// ============================================================
async function runPatterns() {
  console.log("\n== Phase: content-type URL options ==");
  for (const [uid, opts] of Object.entries(CT_OPTIONS)) {
    try {
      const ct = await getCT(uid);
      const before = { is_page: ct.options?.is_page, url_pattern: ct.options?.url_pattern, url_prefix: ct.options?.url_prefix };
      // genre needs a url field before it can be a page
      let addedField = false;
      if (uid === "genre" && !ct.schema.some((f) => f.uid === "url")) {
        const i = ct.schema.findIndex((f) => f.uid === "slug");
        ct.schema.splice(i === -1 ? ct.schema.length : i + 1, 0, urlField());
        addedField = true;
      }
      ct.options = { ...ct.options, ...opts };
      const changed = addedField || JSON.stringify(before) !== JSON.stringify({ is_page: opts.is_page, url_pattern: opts.url_pattern, url_prefix: opts.url_prefix });
      if (DRY) {
        console.log(`  [dry] ${uid}: ${before.url_pattern ?? "(none)"} -> ${opts.url_pattern}${addedField ? "  (+ add url field)" : ""}${changed ? "" : "  (no change)"}`);
        continue;
      }
      await putCT(ct);
      console.log(`  ${uid}: url_pattern -> ${opts.url_pattern}${addedField ? " (+url field added)" : ""}`);
    } catch (e) { console.log(`  ! ${uid}: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
  }
}

// ============================================================
// Phase: rewrite entry urls
// ============================================================
const SYS = ["_version", "_in_progress", "created_at", "updated_at", "created_by", "updated_by",
  "ACL", "_metadata", "publish_details", "stackHeaders", "_owner", "_content_type_uid", "urlPath", "uid", "locale", "tags", "title"];

// GET returns file fields as expanded asset objects; the CMA needs just the asset uid on
// write. Recursively collapse any asset object (has uid + filename + content_type) to its
// uid, including inside groups/global fields and arrays. Reference objects lack `filename`
// so they pass through untouched.
function stripAssets(v) {
  if (Array.isArray(v)) return v.map(stripAssets);
  if (v && typeof v === "object") {
    if (typeof v.uid === "string" && typeof v.filename === "string" && "content_type" in v) return v.uid;
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = stripAssets(val);
    return o;
  }
  return v;
}
async function getEntries(ct) {
  const out = [];
  for (let skip = 0; skip < 2000; skip += 100) {
    const r = await cma("GET", `/content_types/${ct}/entries?limit=100&skip=${skip}`);
    const items = r.entries || [];
    if (!items.length) break;
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

async function runEntries() {
  console.log("\n== Phase: rewrite stored entry urls ==");
  for (const [ct, fn] of Object.entries(ENTRY_URL)) {
    try {
      const entries = await getEntries(ct);
      let changed = 0, ok = 0, skip = 0;
      for (const e of entries) {
        if (!e.slug) { skip++; console.log(`  ? ${ct}/${e.uid}: no slug — skipped`); continue; }
        const target = fn(e);
        if (e.url === target) { ok++; continue; }
        if (DRY) { console.log(`  [dry] ${ct}: "${e.title}"  ${e.url ?? "(none)"} -> ${target}`); changed++; continue; }
        // send full entry (minus system keys) with url replaced, so no fields are dropped
        const body = { title: e.title };
        for (const [k, v] of Object.entries(e)) if (!SYS.includes(k)) body[k] = stripAssets(v);
        body.url = target;
        await cma("PUT", `/content_types/${ct}/entries/${e.uid}`, { entry: body });
        changed++;
      }
      console.log(`  ${ct}: ${changed} ${DRY ? "would change" : "rewritten"}, ${ok} already correct${skip ? `, ${skip} skipped` : ""} (of ${entries.length})`);
    } catch (e) { console.log(`  ! ${ct}: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
  }
  if (!DRY) console.log("  NOTE: republish these entries so the live site + preview pick up the new urls.");
}

// ============================================================
// Phase: republish url-changed entries
// ============================================================
// "Republish" = push each entry back to exactly the environments it is ALREADY
// live on (read from publish_details), so no entry is newly exposed. Entries that
// were never published are skipped.
async function runRepublish() {
  console.log("\n== Phase: republish url-changed entries ==");
  for (const ct of Object.keys(ENTRY_URL)) {
    let published = 0, unpub = 0, failed = 0, entries = [];
    try {
      for (let skip = 0; skip < 2000; skip += 100) {
        const r = await cma("GET", `/content_types/${ct}/entries?limit=100&skip=${skip}&include_publish_details=true`);
        const items = r.entries || [];
        if (!items.length) break;
        entries.push(...items);
        if (items.length < 100) break;
      }
    } catch (e) { console.log(`  ! ${ct}: ${e.status || e.message}`); continue; }

    let gated = 0;
    for (const e of entries) {
      const details = e.publish_details || [];
      const environments = [...new Set(details.map((p) => p.environment))].filter(Boolean);
      const locales = [...new Set(details.map((p) => p.locale))].filter(Boolean);
      if (!environments.length) { unpub++; continue; }
      const loc = locales.length ? locales : ["en-us"];
      // publish per-environment so an environment gated by a Tier 2 publish rule
      // (e.g. production) doesn't block the ungated ones (e.g. development).
      for (const env of environments) {
        if (DRY) { console.log(`  [dry] ${ct} "${e.title}" -> ${env}`); published++; continue; }
        try {
          await cma("POST", `/content_types/${ct}/entries/${e.uid}/publish`, { entry: { environments: [env], locales: loc } });
          published++;
        } catch (err) {
          const msg = JSON.stringify(err.body || {});
          if (/Publish Rule/i.test(msg)) { gated++; }
          else { failed++; console.log(`  ! ${ct}/${e.uid} ("${e.title}") -> ${env}: ${err.status || err.message}`); if (err.body) console.log("    ", msg); }
        }
      }
    }
    console.log(`  ${ct}: ${published} ${DRY ? "would publish" : "queued"}, ${gated} gated by publish rule, ${unpub} never-published, ${failed} failed (${entries.length} entries)`);
  }
  if (!DRY) console.log("  Publishes are queued asynchronously — check the publish queue for completion.");
}

// ---- main --------------------------------------------------
const phase = (process.argv.slice(2).find((a) => !a.startsWith("-")) || "all").toLowerCase();
const run = {
  patterns: runPatterns,
  entries: runEntries,
  republish: runRepublish,
  all: async () => { await runPatterns(); await runEntries(); },
};

console.log(`\n🎬 Flixstack URL patterns  (branch: ${BRANCH}, region: ${REGION}, phase: ${phase}${DRY ? ", DRY-RUN — no writes" : ""})`);
(run[phase] || (() => { console.error("unknown phase:", phase, "\nexpected: patterns | entries | all"); process.exit(1); }))()
  .then(() => console.log(`\n✓ Done: ${phase}\n`))
  .catch((e) => { console.error("\n✗ FAILED:", e.message); process.exit(1); });
