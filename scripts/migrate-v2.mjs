#!/usr/bin/env node
// ============================================================
// Flixstack content-model v2 migration
//
// Runs against the `model_v2` Contentstack branch. Idempotent & re-runnable.
// Reshapes the stack to the structured-content model:
//   - content_tags taxonomy terms (seeded from existing tag values)
//   - movie/tv_series: title_metadata + artwork global fields, taxonomy field
//   - tv_series: adds seo global field
//   - hero_banner/header/page.promo_block: cta global field
//   - navigation.links: link global field (data-compatible with old group)
//   - person.role: multiple enum (+ writer)
//   - site_config.feature_flags: group[] { key, enabled }
//   - genre: seo global field
//
// Usage: node scripts/migrate-v2.mjs [terms|schema|entries|publish|all]
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// ============================================================

import { readFileSync } from "node:fs";

// ---- env ---------------------------------------------------
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const ENV = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || "development";
const BRANCH = process.env.MIGRATE_BRANCH || "model_v2";
const BASE = "https://api.contentstack.io/v3";
const TAXONOMY_UID = "content_tags";

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN");
  process.exit(1);
}

// ---- CMA helper --------------------------------------------
async function cma(method, path, body, { taxonomy = false, branch = BRANCH } = {}) {
  const headers = {
    api_key: API_KEY,
    authorization: MGMT,
    "Content-Type": "application/json",
  };
  if (!taxonomy) headers.branch = branch; // taxonomies are stack-level, not branch-scoped
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// distinct tag values in the catalog (source of the governed vocabulary)
const TAGS = [
  "80s","action","ai","aliens","anxiety","assassin","batman","best-drama","betrayal","biography",
  "blockbuster","cars","cerebral","chef","class","classic","crime","cyberpunk","dark","desert",
  "dog","dreams","drug","dystopia","ensemble","epic","europe","family","feminist","friendship",
  "heist","hope","horror","hotel","immigration","jets","joker","kids","korea","language","mafia",
  "messiah","military","mind-bending","multiverse","murder","mystery","neo-noir","nuclear",
  "oscar-winner","post-apocalyptic","prison","prophecy","quirky","race","restaurant","revenge",
  "sci-fi","science","sequel","simulation","social","space","startup","superhero","supernatural",
  "tech","thriller","time","time-travel","transformation","true-story","upside-down","war",
  "wes-anderson","whodunit","ww2",
];
const title = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ---- schema-field builders ---------------------------------
const gf = (uid, display_name, reference_to, multiple = false) => ({
  display_name, uid, data_type: "global_field", reference_to,
  multiple, mandatory: false, unique: false, non_localizable: false,
});
const taxonomyField = () => ({
  data_type: "taxonomy",
  display_name: "Tags",
  uid: "taxonomies",
  taxonomies: [{ taxonomy_uid: TAXONOMY_UID, max_terms: 25, mandatory: false, non_localizable: false }],
  field_metadata: { description: "" },
  multiple: true, mandatory: false, unique: false, non_localizable: false,
});

// insert `fields` into schema right before the field with uid `beforeUid` (or append)
function insertBefore(schema, beforeUid, fields) {
  const i = schema.findIndex((f) => f.uid === beforeUid);
  if (i === -1) return [...schema, ...fields];
  return [...schema.slice(0, i), ...fields, ...schema.slice(i)];
}
const without = (schema, uids) => schema.filter((f) => !uids.includes(f.uid));
const has = (schema, uid) => schema.some((f) => f.uid === uid);

// ---- Phase 1: taxonomy terms -------------------------------
async function migrateTerms() {
  console.log("\n== Phase 1: taxonomy terms ==");
  let existing = new Set();
  try {
    const res = await cma("GET", `/taxonomies/${TAXONOMY_UID}/terms?limit=100`, null, { taxonomy: true });
    existing = new Set((res.terms || []).map((t) => t.uid));
  } catch (e) { console.log("  (could not list terms, will attempt creates)", e.status || e.message); }

  let created = 0, skipped = 0;
  let order = 1;
  for (const tag of TAGS) {
    const uid = slug(tag);
    if (existing.has(uid)) { skipped++; order++; continue; }
    try {
      await cma("POST", `/taxonomies/${TAXONOMY_UID}/terms`, {
        term: { uid, name: title(tag), parent_uid: null, order },
      }, { taxonomy: true });
      created++;
    } catch (e) {
      if (e.status === 409 || e.status === 422) { skipped++; }
      else throw e;
    }
    order++;
  }
  console.log(`  terms: created ${created}, skipped/existing ${skipped}, total ${TAGS.length}`);
}

// ---- Phase 2: content-type schemas -------------------------
async function getCT(uid, branch = BRANCH) {
  const r = await cma("GET", `/content_types/${uid}`, null, { branch });
  return r.content_type;
}
async function putCT(ct, schema, branch = BRANCH) {
  const body = { content_type: { title: ct.title, uid: ct.uid, schema, options: ct.options, description: ct.description } };
  if (ct.field_rules) body.content_type.field_rules = ct.field_rules;
  await cma("PUT", `/content_types/${ct.uid}`, body, { branch });
}

async function migrateSchemas() {
  console.log("\n== Phase 2: content-type schemas ==");

  // movie
  {
    const ct = await getCT("movie");
    if (has(ct.schema, "title_metadata")) { console.log("  movie: already migrated"); }
    else {
      let s = without(ct.schema, ["rating", "content_tier", "release_date", "score", "hero_image", "thumbnail", "content_tags"]);
      s = insertBefore(s, "seo", [gf("title_metadata", "Title Metadata", "title_metadata"), gf("artwork", "Artwork", "artwork"), taxonomyField()]);
      await putCT(ct, s); console.log("  movie: migrated");
    }
  }
  // tv_series (also gains seo)
  {
    const ct = await getCT("tv_series");
    if (has(ct.schema, "title_metadata")) { console.log("  tv_series: already migrated"); }
    else {
      let s = without(ct.schema, ["rating", "content_tier", "release_date", "score", "hero_image", "thumbnail", "content_tags"]);
      const add = [gf("title_metadata", "Title Metadata", "title_metadata"), gf("artwork", "Artwork", "artwork"), taxonomyField()];
      if (!has(s, "seo")) add.push(gf("seo", "SEO", "seo"));
      s = insertBefore(s, "availability_window", add);
      await putCT(ct, s); console.log("  tv_series: migrated");
    }
  }
  // hero_banner
  {
    const ct = await getCT("hero_banner");
    if (has(ct.schema, "cta")) { console.log("  hero_banner: already migrated"); }
    else {
      let s = without(ct.schema, ["cta_label", "cta_url"]);
      s = insertBefore(s, "background_image", [gf("cta", "CTA", "cta")]);
      await putCT(ct, s); console.log("  hero_banner: migrated");
    }
  }
  // header
  {
    const ct = await getCT("header");
    if (has(ct.schema, "cta")) { console.log("  header: already migrated"); }
    else {
      let s = without(ct.schema, ["cta_label", "cta_url"]);
      s = insertBefore(s, "show_search", [gf("cta", "CTA", "cta")]);
      await putCT(ct, s); console.log("  header: migrated");
    }
  }
  // navigation: links group -> link global field (multiple)
  {
    const ct = await getCT("navigation");
    const links = ct.schema.find((f) => f.uid === "links");
    if (links && links.data_type === "global_field") { console.log("  navigation: already migrated"); }
    else {
      const s = ct.schema.map((f) => (f.uid === "links" ? gf("links", "Links", "link", true) : f));
      await putCT(ct, s); console.log("  navigation: migrated");
    }
  }
  // person: role -> multiple enum (+ writer)
  {
    const ct = await getCT("person");
    const role = ct.schema.find((f) => f.uid === "role");
    if (role && role.multiple) { console.log("  person: already migrated"); }
    else {
      const s = ct.schema.map((f) => {
        if (f.uid !== "role") return f;
        const choices = (f.enum?.choices || []).slice();
        if (!choices.some((c) => c.value === "writer")) choices.push({ key: "writer", value: "writer" });
        return { ...f, multiple: true, enum: { advanced: f.enum?.advanced ?? true, choices } };
      });
      await putCT(ct, s); console.log("  person: migrated");
    }
  }
  // site_config: feature_flags json -> group[] { key, enabled }
  {
    const ct = await getCT("site_config");
    const ff = ct.schema.find((f) => f.uid === "feature_flags");
    if (ff && ff.data_type === "group") { console.log("  site_config: already migrated"); }
    else {
      const s = ct.schema.map((f) => (f.uid === "feature_flags" ? {
        display_name: "Feature Flags", uid: "feature_flags", data_type: "group",
        field_metadata: { description: "", instruction: "" },
        schema: [
          { display_name: "Key", uid: "key", data_type: "text", multiple: false, mandatory: false, unique: false, non_localizable: false },
          { display_name: "Enabled", uid: "enabled", data_type: "boolean", multiple: false, mandatory: false, unique: false, non_localizable: false },
        ],
        multiple: true, mandatory: false, unique: false, non_localizable: false,
      } : f));
      await putCT(ct, s); console.log("  site_config: migrated");
    }
  }
  // genre: add seo
  {
    const ct = await getCT("genre");
    if (has(ct.schema, "seo")) { console.log("  genre: already migrated"); }
    else { await putCT(ct, [...ct.schema, gf("seo", "SEO", "seo")]); console.log("  genre: migrated"); }
  }
  // page: promo_block cta_label/cta_url -> cta
  {
    const ct = await getCT("page");
    const sections = ct.schema.find((f) => f.uid === "sections");
    const promo = sections?.blocks?.find((b) => b.uid === "promo_block");
    if (!promo) { console.log("  page: no promo_block, skipped"); }
    else if (promo.schema.some((f) => f.uid === "cta")) { console.log("  page: already migrated"); }
    else {
      const newSections = { ...sections, blocks: sections.blocks.map((b) => {
        if (b.uid !== "promo_block") return b;
        let bs = b.schema.filter((f) => !["cta_label", "cta_url"].includes(f.uid));
        bs = insertBefore(bs, "layout", [gf("cta", "CTA", "cta")]);
        return { ...b, schema: bs };
      }) };
      const s = ct.schema.map((f) => (f.uid === "sections" ? newSections : f));
      await putCT(ct, s); console.log("  page: migrated");
    }
  }
}

// ---- Phase 3: entries --------------------------------------
async function getEntries(ct, branch = BRANCH) {
  const r = await cma("GET", `/content_types/${ct}/entries?limit=100`, null, { branch });
  return r.entries || [];
}
async function mainMap(ct) {
  const m = new Map();
  for (const e of await getEntries(ct, "main")) m.set(e.uid, e);
  return m;
}
const SYS = ["uid", "_version", "_in_progress", "created_at", "updated_at", "created_by",
  "updated_by", "ACL", "_metadata", "publish_details", "stackHeaders", "_owner", "_content_type_uid", "urlPath"];
function clean(entry) {
  const out = {};
  for (const [k, v] of Object.entries(entry)) if (!SYS.includes(k)) out[k] = v;
  return out;
}
const assetUid = (f) => (f && typeof f === "object" ? f.uid : f) || undefined;

async function updateEntry(ct, uid, entry) {
  await cma("PUT", `/content_types/${ct}/entries/${uid}`, { entry });
}

async function migrateTitleEntries(ct) {
  const entries = await getEntries(ct);
  let done = 0, skip = 0;
  for (const e of entries) {
    if (e.title_metadata) { skip++; continue; }
    const n = clean(e);
    n.title_metadata = { rating: e.rating ?? null, content_tier: e.content_tier ?? null, release_date: e.release_date ?? null, score: e.score ?? null };
    n.artwork = { hero_image: assetUid(e.hero_image), thumbnail: assetUid(e.thumbnail) };
    n.taxonomies = (e.content_tags || []).map((t) => ({ taxonomy_uid: TAXONOMY_UID, term_uid: slug(t) }));
    delete n.rating; delete n.content_tier; delete n.release_date; delete n.score;
    delete n.hero_image; delete n.thumbnail; delete n.content_tags;
    await updateEntry(ct, e.uid, n);
    done++;
  }
  console.log(`  ${ct}: updated ${done}, already-migrated ${skip}`);
}

async function migrateEntries() {
  console.log("\n== Phase 3: entries ==");
  await migrateTitleEntries("movie");
  await migrateTitleEntries("tv_series");

  // hero_banner
  {
    let done = 0, skip = 0;
    for (const e of await getEntries("hero_banner")) {
      if (e.cta) { skip++; continue; }
      const n = clean(e);
      n.cta = { label: e.cta_label ?? "", url: e.cta_url ?? "", style: "primary", open_in_new_tab: false };
      n.background_image = assetUid(e.background_image);
      delete n.cta_label; delete n.cta_url;
      await updateEntry("hero_banner", e.uid, n); done++;
    }
    console.log(`  hero_banner: updated ${done}, skip ${skip}`);
  }
  // header
  {
    let done = 0, skip = 0;
    for (const e of await getEntries("header")) {
      if (e.cta) { skip++; continue; }
      const n = clean(e);
      n.cta = { label: e.cta_label ?? "", url: e.cta_url ?? "", style: "primary", open_in_new_tab: false };
      n.logo = assetUid(e.logo);
      delete n.cta_label; delete n.cta_url;
      await updateEntry("header", e.uid, n); done++;
    }
    console.log(`  header: updated ${done}, skip ${skip}`);
  }
  // person: role -> array
  {
    let done = 0, skip = 0;
    for (const e of await getEntries("person")) {
      if (Array.isArray(e.role)) { skip++; continue; }
      const n = clean(e);
      n.role = e.role ? [e.role] : [];
      n.photo = assetUid(e.photo);
      await updateEntry("person", e.uid, n); done++;
    }
    console.log(`  person: updated ${done}, skip ${skip}`);
  }
  // site_config: feature_flags object -> array
  {
    let done = 0, skip = 0;
    for (const e of await getEntries("site_config")) {
      if (Array.isArray(e.feature_flags)) { skip++; continue; }
      const n = clean(e);
      const ff = e.feature_flags && typeof e.feature_flags === "object" ? e.feature_flags : {};
      n.feature_flags = Object.entries(ff).map(([key, enabled]) => ({ key, enabled: Boolean(enabled) }));
      await updateEntry("site_config", e.uid, n); done++;
    }
    console.log(`  site_config: updated ${done}, skip ${skip}`);
  }
  // navigation entries are data-compatible (group == link GF shape); no changes needed.
}

// ---- Phase 3b: backfill from main --------------------------
// Recovers old-field values (rating, tags, artwork, cta, ...) from the pristine
// `main` branch and writes them into the new nested fields on `model_v2`. Needed
// because the schema change dropped the old fields before their data was read.
async function backfill() {
  console.log("\n== Phase 3b: backfill from main ==");

  for (const ct of ["movie", "tv_series"]) {
    const main = await mainMap(ct);
    let done = 0;
    for (const e of await getEntries(ct)) {
      const m = main.get(e.uid);
      if (!m) { console.log(`    ! no main match for ${ct}/${e.uid}`); continue; }
      const n = clean(e);
      n.title_metadata = { rating: m.rating ?? null, content_tier: m.content_tier ?? null, release_date: m.release_date ?? null, score: m.score ?? null };
      n.artwork = { hero_image: assetUid(m.hero_image), thumbnail: assetUid(m.thumbnail) };
      n.taxonomies = (m.content_tags || []).map((t) => ({ taxonomy_uid: TAXONOMY_UID, term_uid: slug(t) }));
      await updateEntry(ct, e.uid, n); done++;
    }
    console.log(`  ${ct}: backfilled ${done}`);
  }

  for (const ct of ["hero_banner", "header"]) {
    const main = await mainMap(ct);
    let done = 0;
    for (const e of await getEntries(ct)) {
      const m = main.get(e.uid) || {};
      const n = clean(e);
      n.cta = { label: m.cta_label ?? "", url: m.cta_url ?? "", style: "primary", open_in_new_tab: false };
      if ("background_image" in n) n.background_image = assetUid(n.background_image);
      if ("logo" in n) n.logo = assetUid(n.logo);
      await updateEntry(ct, e.uid, n); done++;
    }
    console.log(`  ${ct}: backfilled ${done}`);
  }

  // person.role (single->multiple change dropped the value)
  {
    const main = await mainMap("person");
    let done = 0;
    for (const e of await getEntries("person")) {
      const m = main.get(e.uid) || {};
      const n = clean(e);
      n.role = Array.isArray(m.role) ? m.role : (m.role ? [m.role] : []);
      if ("photo" in n) n.photo = assetUid(n.photo);
      await updateEntry("person", e.uid, n); done++;
    }
    console.log(`  person: backfilled ${done}`);
  }

  // navigation.links (group->global_field change dropped the value; shapes are identical)
  {
    const main = await mainMap("navigation");
    let done = 0;
    for (const e of await getEntries("navigation")) {
      const m = main.get(e.uid) || {};
      const n = clean(e);
      n.links = (m.links || []).map((l) => ({ label: l.label, href: l.href, open_in_new_tab: Boolean(l.open_in_new_tab) }));
      await updateEntry("navigation", e.uid, n); done++;
    }
    console.log(`  navigation: backfilled ${done}`);
  }
}

// ---- Finalize main -----------------------------------------
// `merge_branch` (schema-only, field-level union) leaves the old fields on `main`
// alongside the new ones, and does not carry entry data. This makes `main` an exact
// copy of `model_v2`: overwrite each modified content-type schema, then sync the
// reshaped entries from `model_v2` and publish them on `main`.
async function finalizeMain() {
  console.log("\n== Finalize main: overwrite schemas + sync entries ==");
  const SCHEMA_CTS = ["movie", "tv_series", "hero_banner", "header", "navigation", "person", "site_config", "genre", "page"];
  for (const uid of SCHEMA_CTS) {
    const src = await getCT(uid, "model_v2");
    await putCT(src, src.schema, "main");
    console.log(`  schema -> main: ${uid}`);
  }

  const ENTRY_CTS = ["movie", "tv_series", "hero_banner", "header", "person", "navigation"];
  for (const ct of ENTRY_CTS) {
    let n = 0;
    for (const e of await getEntries(ct, "model_v2")) {
      const body = clean(e);
      if (body.artwork) body.artwork = { hero_image: assetUid(e.artwork?.hero_image), thumbnail: assetUid(e.artwork?.thumbnail) };
      if ("background_image" in body) body.background_image = assetUid(e.background_image);
      if ("logo" in body) body.logo = assetUid(e.logo);
      if ("photo" in body) body.photo = assetUid(e.photo);
      if (Array.isArray(body.links)) body.links = body.links.map(({ _metadata, ...l }) => l);
      await cma("PUT", `/content_types/${ct}/entries/${e.uid}`, { entry: body }, { branch: "main" });
      await cma("POST", `/content_types/${ct}/entries/${e.uid}/publish`, { entry: { environments: [ENV], locales: ["en-us"] } }, { branch: "main" });
      n++;
    }
    console.log(`  entries -> main: ${ct} (${n})`);
  }
}

// ---- Phase 4: publish --------------------------------------
const PUBLISH_CTS = ["genre", "person", "episode", "movie", "tv_series", "hero_banner", "homepage_rail", "site_config", "navigation", "header", "footer"];

async function publishEntries(env, branch = BRANCH) {
  for (const ct of PUBLISH_CTS) {
    let n = 0;
    for (const e of await getEntries(ct, branch)) {
      try {
        await cma("POST", `/content_types/${ct}/entries/${e.uid}/publish`, {
          entry: { environments: [env], locales: ["en-us"] },
        }, { branch });
        n++;
      } catch (err) { console.log(`    ! publish ${ct}/${e.uid}:`, err.status || err.message); }
    }
    console.log(`  ${ct}: published ${n} -> ${env}`);
  }
}

// Assets are stack-level, but their *published* state is still per-environment; the
// site's <Image> tags 404 unless the asset is published to the reading environment.
async function publishAssets(env, branch = BRANCH) {
  let skip = 0, total = 0;
  const seen = new Set();
  for (let page = 0; page < 20; page++) {
    const r = await cma("GET", `/assets?limit=100&skip=${page * 100}`, null, { branch });
    const assets = r.assets || [];
    if (!assets.length) break;
    for (const a of assets) {
      if (seen.has(a.uid)) continue;
      seen.add(a.uid);
      try {
        await cma("POST", `/assets/${a.uid}/publish`, {
          asset: { environments: [env], locales: ["en-us"] },
        }, { branch });
        total++;
      } catch (err) { skip++; console.log(`    ! publish asset ${a.uid}:`, err.status || err.message); }
    }
    if (assets.length < 100) break;
  }
  console.log(`  assets: published ${total} -> ${env} (errors ${skip})`);
}

async function publishAll() {
  console.log("\n== Phase 4: publish to", ENV, "==");
  await publishEntries(ENV);
  await publishAssets(ENV);
}

// Publish everything (entries + assets) on `main` to the production environment.
async function publishProd() {
  const env = process.env.PROD_ENV || "production";
  console.log(`\n== Publish main -> ${env} ==`);
  await publishEntries(env, "main");
  await publishAssets(env, "main");
}

// ---- main --------------------------------------------------
const phase = process.argv[2] || "all";
const run = {
  terms: migrateTerms,
  schema: migrateSchemas,
  entries: migrateEntries,
  backfill,
  finalizemain: finalizeMain,
  publish: publishAll,
  publishprod: publishProd,
  all: async () => { await migrateTerms(); await migrateSchemas(); await migrateEntries(); await backfill(); await publishAll(); },
};
(run[phase] || (() => { console.error("unknown phase", phase); process.exit(1); }))()
  .then(() => console.log("\nDone:", phase))
  .catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
