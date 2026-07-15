#!/usr/bin/env node
// ============================================================
// Flixstack — Tier 4 content governance (assets, localization, taxonomy)
//
// Implements the scriptable parts of docs/cms-editor-experience-tier4.md:
//   [folders]         create asset folders and move each asset in by filename
//   [alt]             backfill each asset's Description from its title (a11y)
//   [nonlocalizable]  mark structural fields non_localizable (L10n readiness)
//   [taxonomies]      OPT-IN: create mood / franchise / maturity taxonomies +
//                     starter terms and add one dedicated field per taxonomy to
//                     movie & tv_series
//
// All phases are idempotent and re-runnable. `all` runs folders + alt +
// nonlocalizable (the reliably-beneficial set). `taxonomies` is intentionally
// separate — REVIEW the starter vocabularies below before running it.
//
// Usage (alias: `pnpm content-governance <phase> [--dry]`):
//   node scripts/content-governance.mjs [folders|alt|nonlocalizable|taxonomies|all] [--dry]
//     --dry : read + print planned changes, make NO writes
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

// taxonomy endpoints are stack-level (no branch header); everything else is branch-scoped.
async function cma(method, path, body, { taxonomy = false } = {}) {
  const headers = { api_key: API_KEY, authorization: MGMT, "Content-Type": "application/json" };
  if (!taxonomy) headers.branch = BRANCH;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status; err.body = json; throw err;
  }
  return json;
}

// ============================================================
// Phase: asset folders + moves
// ============================================================
const FOLDERS = ["posters", "hero-art", "episode-stills", "people", "genre-art", "logos", "promo"];
// Ordered rules: first match wins. Prefix rules precede suffix rules so genre/episode
// art routes by subject before the generic hero/thumbnail suffix rules apply.
const ROUTE = [
  { folder: "people", test: (f) => /^person-/i.test(f) },
  { folder: "genre-art", test: (f) => /^genre-/i.test(f) },
  { folder: "episode-stills", test: (f) => /^episode-/i.test(f) },
  { folder: "logos", test: (f) => /^logo-/i.test(f) },
  { folder: "promo", test: (f) => /^promo-/i.test(f) },
  { folder: "hero-art", test: (f) => /-hero\.[a-z0-9]+$/i.test(f) },
  { folder: "posters", test: (f) => /-(thumbnail|poster)\.[a-z0-9]+$/i.test(f) },
];
const routeFor = (filename) => ROUTE.find((r) => r.test(filename))?.folder ?? null;

async function listAssets() {
  const files = [], folders = [];
  for (let skip = 0; skip < 2000; skip += 100) {
    const r = await cma("GET", `/assets?include_folders=true&limit=100&skip=${skip}`);
    const items = r.assets || [];
    if (!items.length) break;
    for (const a of items) (a.is_dir ? folders : files).push(a);
    if (items.length < 100) break;
  }
  return { files, folders };
}

async function runFolders() {
  console.log("\n== Phase: asset folders + moves ==");
  const { files, folders } = await listAssets();
  const folderUid = new Map(folders.map((f) => [f.name, f.uid]));

  // 1) ensure folders exist
  for (const name of FOLDERS) {
    if (folderUid.has(name)) { console.log(`  folder ${name}: exists`); continue; }
    if (DRY) { console.log(`  [dry] CREATE folder ${name}`); folderUid.set(name, `<new:${name}>`); continue; }
    const r = await cma("POST", "/assets/folders", { asset: { name } });
    folderUid.set(name, r.asset.uid);
    console.log(`  + folder ${name}: created (${r.asset.uid})`);
  }

  // 2) move each file to its target folder
  let moved = 0, already = 0, skipped = 0;
  for (const a of files) {
    const target = routeFor(a.filename);
    if (!target) { skipped++; console.log(`  ? no rule for ${a.filename} — left in root`); continue; }
    const targetUid = folderUid.get(target);
    if (a.parent_uid && a.parent_uid === targetUid) { already++; continue; }
    if (DRY) { console.log(`  [dry] MOVE ${a.filename} -> ${target}`); moved++; continue; }
    await cma("PUT", `/assets/${a.uid}`, { asset: { parent_uid: targetUid } });
    moved++;
  }
  console.log(`  assets: ${moved} moved, ${already} already placed, ${skipped} unrouted (of ${files.length})`);
}

// ============================================================
// Phase: alt / description backfill
// ============================================================
async function runAlt() {
  console.log("\n== Phase: asset description (alt) backfill ==");
  const { files } = await listAssets();
  let set = 0, skip = 0;
  for (const a of files) {
    if (a.description && a.description.trim()) { skip++; continue; }
    const desc = a.title || a.filename;
    if (DRY) { console.log(`  [dry] ${a.filename}  desc <- "${desc}"`); set++; continue; }
    await cma("PUT", `/assets/${a.uid}`, { asset: { description: desc } });
    set++;
  }
  console.log(`  descriptions: ${set} set, ${skip} already had one (of ${files.length})`);
  console.log("  NOTE: derived from asset titles — editors can refine. Once reviewed, flip the");
  console.log("        Tier 1 *_alt fields to mandatory.");
}

// ============================================================
// Phase: non-localizable flags (localization readiness)
// ============================================================
// Structural / language-agnostic fields that must NOT fork per locale.
const NONLOC_CT = {
  movie: ["slug", "url", "trailer_url"],
  tv_series: ["slug", "url"],
  episode: ["slug"],
  person: ["slug", "url"],
  genre: ["slug", "color_accent"],
  page: ["slug", "url"],
  site_config: ["feature_flags.key"],
  setup_guide: ["features.anchor_id"],
};
const NONLOC_GF = { availability_window: ["regions"] };

// --- nested field walker (groups + modular blocks) ---
function childContext(field, nextSegment) {
  if (Array.isArray(field.schema)) return { schema: field.schema, consumed: 0 };
  if (Array.isArray(field.blocks)) {
    const block = field.blocks.find((b) => b.uid === nextSegment);
    return block && Array.isArray(block.schema) ? { schema: block.schema, consumed: 1 } : null;
  }
  return null;
}
function setNonLoc(schema, pathArr) {
  const [head, ...rest] = pathArr;
  const field = schema.find((f) => f.uid === head);
  if (!field) return false;
  if (rest.length === 0) { field.non_localizable = true; return true; }
  const ctx = childContext(field, rest[0]);
  return ctx ? setNonLoc(ctx.schema, rest.slice(ctx.consumed)) : false;
}

const getCT = async (uid) => (await cma("GET", `/content_types/${uid}`)).content_type;
async function putCT(ct) {
  if (DRY) return;
  const body = { content_type: { title: ct.title, uid: ct.uid, schema: ct.schema, options: ct.options, description: ct.description } };
  if (ct.field_rules) body.content_type.field_rules = ct.field_rules;
  await cma("PUT", `/content_types/${ct.uid}`, body);
}
const getGF = async (uid) => (await cma("GET", `/global_fields/${uid}`)).global_field;
async function putGF(gf) {
  if (DRY) return;
  await cma("PUT", `/global_fields/${gf.uid}`, { global_field: { title: gf.title, uid: gf.uid, schema: gf.schema, description: gf.description } });
}

async function runNonLocalizable() {
  console.log("\n== Phase: mark non-localizable fields ==");
  console.log("  (structural fields that should not fork when locales are added)");
  for (const [uid, paths] of Object.entries(NONLOC_CT)) {
    try {
      const ct = await getCT(uid);
      let ok = 0;
      for (const p of paths) { if (setNonLoc(ct.schema, p.split("."))) ok++; else console.log(`    ! ${uid}: not found -> ${p}`); }
      await putCT(ct);
      console.log(`  ${uid}: ${ok}/${paths.length} field(s) non_localizable${DRY ? " [dry]" : ""}  (${paths.join(", ")})`);
    } catch (e) { console.log(`  ! ${uid}: ${e.status || e.message}`); }
  }
  for (const [uid, paths] of Object.entries(NONLOC_GF)) {
    try {
      const gf = await getGF(uid);
      let ok = 0;
      for (const p of paths) { if (setNonLoc(gf.schema, p.split("."))) ok++; else console.log(`    ! ${uid}: not found -> ${p}`); }
      await putGF(gf);
      console.log(`  ${uid} (global field): ${ok}/${paths.length} non_localizable${DRY ? " [dry]" : ""}  (${paths.join(", ")})`);
    } catch (e) { console.log(`  ! ${uid}: ${e.status || e.message}`); }
  }
}

// ============================================================
// Phase: new taxonomies (OPT-IN — review vocabularies first)
// ============================================================
// >>> REVIEW THESE with the content team before running `taxonomies`. <<<
const TAXONOMIES = [
  {
    uid: "mood", name: "Mood",
    description: "Emotional tone of a title, for mood-based rails and filtering.",
    instruction: "Emotional tone — pick 1–3 that best capture how the title feels.",
    terms: ["cozy", "tense", "feel-good", "dark", "cerebral", "uplifting", "suspenseful", "heartwarming", "gritty", "quirky"],
  },
  {
    uid: "franchise", name: "Franchise / Collection",
    description: "Groups titles that belong to the same franchise or curated collection.",
    instruction: "Franchise or curated collection this title belongs to. Leave blank if standalone.",
    terms: ["dune", "the-matrix", "john-wick", "stranger-things", "breaking-bad-universe"],
  },
  {
    uid: "maturity_themes", name: "Maturity Themes",
    description: "Content advisories used for parental filtering.",
    instruction: "Content advisories for parental filtering. Select all that apply.",
    terms: ["violence", "strong-language", "substances", "sexual-content", "frightening-scenes"],
  },
];
// NOTE: Contentstack allows only ONE taxonomy field per content type, and its uid is fixed
// to `taxonomies` (error_code 121: "The value 'taxonomies' is fixed for the UID field").
// So "separate fields per taxonomy" isn't possible — instead the new vocabularies are added
// to the single `taxonomies` field, where each renders as its own labeled picker section.
const titleCase = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function runTaxonomies() {
  console.log("\n== Phase: new taxonomies (OPT-IN) ==");
  console.log("  ⚠  Creates real taxonomies + terms and attaches them to movie/tv_series.");
  console.log("     Edit the TAXONOMIES vocabularies in this script before running for real.\n");

  for (const tax of TAXONOMIES) {
    // taxonomy container
    let exists = false;
    try { await cma("GET", `/taxonomies/${tax.uid}`, null, { taxonomy: true }); exists = true; } catch (e) { if (e.status !== 404) throw e; }
    if (DRY) console.log(`  [dry] ${exists ? "EXISTS" : "CREATE"} taxonomy ${tax.uid} (${tax.terms.length} terms)`);
    else if (!exists) { await cma("POST", "/taxonomies", { taxonomy: { uid: tax.uid, name: tax.name, description: tax.description } }, { taxonomy: true }); console.log(`  + taxonomy ${tax.uid}: created`); }
    else console.log(`  taxonomy ${tax.uid}: exists`);

    // terms
    let existing = new Set();
    if (!DRY || exists) {
      try { const r = await cma("GET", `/taxonomies/${tax.uid}/terms?limit=100`, null, { taxonomy: true }); existing = new Set((r.terms || []).map((t) => t.uid)); } catch { /* new taxonomy */ }
    }
    let created = 0, order = 1;
    for (const term of tax.terms) {
      if (existing.has(term)) { order++; continue; }
      if (DRY) { created++; order++; continue; }
      try { await cma("POST", `/taxonomies/${tax.uid}/terms`, { term: { uid: term, name: titleCase(term), parent_uid: null, order } }, { taxonomy: true }); created++; }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
      order++;
    }
    console.log(`    terms: ${created} ${DRY ? "would be created" : "created"}, ${existing.size} existing`);
  }

  // add the new vocabularies to the single `taxonomies` field on movie + tv_series
  for (const uid of ["movie", "tv_series"]) {
    try {
      const ct = await getCT(uid);
      const field = ct.schema.find((f) => f.uid === "taxonomies");
      if (!field) { console.log(`  ! ${uid}: no 'taxonomies' field to extend`); continue; }
      const have = new Set((field.taxonomies || []).map((t) => t.taxonomy_uid));
      const toAdd = TAXONOMIES.filter((t) => !have.has(t.uid));
      if (!toAdd.length) { console.log(`  ${uid}: taxonomies field already includes new vocabularies`); continue; }
      field.taxonomies = [...(field.taxonomies || []), ...toAdd.map((t) => ({ taxonomy_uid: t.uid, max_terms: 10, mandatory: false, non_localizable: false, multiple: true }))];
      if (DRY) { console.log(`  [dry] ${uid}: add ${toAdd.map((t) => t.uid).join(", ")} to taxonomies field`); continue; }
      await putCT(ct);
      console.log(`  ${uid}: added ${toAdd.map((t) => t.uid).join(", ")} to taxonomies field`);
    } catch (e) { console.log(`  ! ${uid}: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
  }
}

// ---- main --------------------------------------------------
const phase = (process.argv.slice(2).find((a) => !a.startsWith("-")) || "all").toLowerCase();
const run = {
  folders: runFolders,
  alt: runAlt,
  nonlocalizable: runNonLocalizable,
  taxonomies: runTaxonomies,
  all: async () => { await runFolders(); await runAlt(); await runNonLocalizable(); },
};

console.log(`\n🎬 Flixstack content governance  (branch: ${BRANCH}, region: ${REGION}, phase: ${phase}${DRY ? ", DRY-RUN — no writes" : ""})`);
(run[phase] || (() => { console.error("unknown phase:", phase, "\nexpected: folders | alt | nonlocalizable | taxonomies | all"); process.exit(1); }))()
  .then(() => console.log(`\n✓ Done: ${phase}\n`))
  .catch((e) => { console.error("\n✗ FAILED:", e.message); process.exit(1); });
