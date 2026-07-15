#!/usr/bin/env node
// ============================================================
// Flixstack — Tier 1 editor-experience field config
//
// Applies the non-destructive editing-experience improvements from
// docs/cms-editor-experience-implementation.md (Tier 1) to the live stack:
//   - field instructions (help text) on every content type + global field
//   - validations: regex `format`, character limits, number ranges
//   - default values (content_tier=free, status=ongoing, header toggles=true, …)
//   - select display types (radio vs dropdown)
//   - [phase `alt`]  companion *_alt text fields on every image field
//   - [phase `rte`]  episode.synopsis  text -> JSON RTE (advanced)
//
// Help text / validations / defaults / display types are SAFE: they never
// change a field's data type or drop data, so `fields` is re-runnable and
// idempotent. `alt` adds empty optional fields. `rte` changes a data type and
// is gated + warned (see the phase).
//
// Global-field subfields (title_metadata.*, artwork.*, seo.*, cta.*, link.*,
// availability_window.*) are patched on the GLOBAL FIELD definition — so the
// help text is authored once and inherited by every content type that uses it.
//
// Usage (or via the alias `pnpm customize-fields <phase> [--dry]`):
//   node scripts/customize-editor-fields.mjs [fields|alt|rte|all] [--dry]
//     fields  (default)  help text + validations + defaults + display types
//     alt                add companion alt-text fields to image fields
//     rte                convert episode.synopsis to JSON RTE  (changes data type)
//     all                fields + alt   (rte is intentionally NOT in `all`)
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION and NEXT_PUBLIC_CONTENTSTACK_BRANCH.
// ============================================================

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ---- env ---------------------------------------------------
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "US").toUpperCase();
const BRANCH = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || "main";

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN in .env.local");
  process.exit(1);
}

// --dry / DRY=1 : read + compute the patch in memory, report what WOULD change,
// and skip every write (no PUT calls). Read-only against the stack.
const DRY = process.argv.includes("--dry") || process.env.DRY === "1";

const CMA_HOST_MAP = {
  US: "api.contentstack.io",
  EU: "eu-api.contentstack.com",
  AU: "au-api.contentstack.com",
  AZURE_NA: "azure-na-api.contentstack.com",
  AZURE_EU: "azure-eu-api.contentstack.com",
  GCP_NA: "gcp-na-api.contentstack.com",
  GCP_EU: "gcp-eu-api.contentstack.com",
};
const BASE = `https://${CMA_HOST_MAP[REGION] ?? CMA_HOST_MAP.US}/v3`;

// ---- CMA helper --------------------------------------------
async function cma(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      api_key: API_KEY,
      authorization: MGMT,
      branch: BRANCH,
      "Content-Type": "application/json",
    },
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

// ============================================================
// Schema helpers
// ============================================================

// Descend one level from a field to the child schema array we should recurse
// into. Groups + local schemas expose `.schema`; modular blocks expose
// `.blocks`, where the *next* path segment selects a block by uid.
function childContext(field, nextSegment) {
  if (Array.isArray(field.schema)) return { schema: field.schema, consumed: 0 };
  if (Array.isArray(field.blocks)) {
    const block = field.blocks.find((b) => b.uid === nextSegment);
    if (!block) return null;
    if (!Array.isArray(block.schema)) block.schema = [];
    return { schema: block.schema, consumed: 1 };
  }
  return null;
}

// Merge `patch` into the field addressed by `pathArr` (array of uids, with a
// block uid inserted where a modular-blocks field is traversed). Mutates the
// schema in place. Returns true if the field was found.
function patchField(schema, pathArr, patch) {
  const [head, ...rest] = pathArr;
  const field = schema.find((f) => f.uid === head);
  if (!field) return false;
  if (rest.length === 0) { mergePatch(field, patch); return true; }
  const ctx = childContext(field, rest[0]);
  if (!ctx) return false;
  return patchField(ctx.schema, rest.slice(ctx.consumed), patch);
}

// Shallow-merge patch onto a field, but deep-merge field_metadata and
// error_messages so we never clobber existing metadata (multiline, rich_text_type…).
function mergePatch(field, patch) {
  const { field_metadata, error_messages, ...rest } = patch;
  Object.assign(field, rest);
  if (field_metadata) field.field_metadata = { ...(field.field_metadata || {}), ...field_metadata };
  if (error_messages) field.error_messages = { ...(field.error_messages || {}), ...error_messages };
}

// Turn a declarative cfg row into a field patch object.
//   { instruction, format, error, min, max, default: d, display_type }
function toPatch(cfg) {
  const patch = {};
  const fm = {};
  if (cfg.instruction != null) fm.instruction = cfg.instruction;
  if ("default" in cfg) fm.default_value = cfg.default;
  if (Object.keys(fm).length) patch.field_metadata = fm;
  if (cfg.format) patch.format = cfg.format;
  if (cfg.error) patch.error_messages = { format: cfg.error };
  if (cfg.min != null) patch.min = cfg.min;
  if (cfg.max != null) patch.max = cfg.max;
  if (cfg.display_type) patch.display_type = cfg.display_type;
  return patch;
}

const hasField = (schema, uid) => schema.some((f) => f.uid === uid);
function insertAfter(schema, afterUid, field) {
  const i = schema.findIndex((f) => f.uid === afterUid);
  if (i === -1) { schema.push(field); return; }
  schema.splice(i + 1, 0, field);
}

// ---- content type + global field IO ------------------------
const getCT = async (uid) => (await cma("GET", `/content_types/${uid}`)).content_type;
async function putCT(ct) {
  if (DRY) return; // dry-run: skip write
  const body = { content_type: { title: ct.title, uid: ct.uid, schema: ct.schema, options: ct.options, description: ct.description } };
  if (ct.field_rules) body.content_type.field_rules = ct.field_rules;
  await cma("PUT", `/content_types/${ct.uid}`, body);
}
const getGF = async (uid) => (await cma("GET", `/global_fields/${uid}`)).global_field;
async function putGF(gf) {
  if (DRY) return; // dry-run: skip write
  await cma("PUT", `/global_fields/${gf.uid}`, {
    global_field: { title: gf.title, uid: gf.uid, schema: gf.schema, description: gf.description },
  });
}

// Read a field back by the same traversal patchField uses (for dry-run preview).
function resolveField(schema, pathArr) {
  const [head, ...rest] = pathArr;
  const field = schema.find((f) => f.uid === head);
  if (!field) return null;
  if (rest.length === 0) return field;
  const ctx = childContext(field, rest[0]);
  if (!ctx) return null;
  return resolveField(ctx.schema, rest.slice(ctx.consumed));
}

// Compact one-line preview of the config now on a field.
function preview(field) {
  const fm = field.field_metadata || {};
  const bits = [];
  if (fm.instruction) bits.push(`help=“${fm.instruction.slice(0, 48)}${fm.instruction.length > 48 ? "…" : ""}”`);
  if (field.format) bits.push(`format=${field.format}`);
  if (field.min != null) bits.push(`min=${field.min}`);
  if (field.max != null) bits.push(`max=${field.max}`);
  if ("default_value" in fm) bits.push(`default=${JSON.stringify(fm.default_value)}`);
  if (field.display_type) bits.push(`display=${field.display_type}`);
  return bits.join("  ");
}

// Apply a list of cfg rows (each with a dotted `path`) to a schema, logging misses.
function applyRows(schema, rows, label) {
  let ok = 0, miss = 0;
  for (const row of rows) {
    const path = row.path.split(".");
    if (patchField(schema, path, toPatch(row))) {
      ok++;
      if (DRY) console.log(`      · ${row.path.padEnd(38)} ${preview(resolveField(schema, path))}`);
    } else { miss++; console.log(`    ! ${label}: field not found -> ${row.path}`); }
  }
  return { ok, miss };
}

// Common regexes / messages.
// NOTE: Contentstack's CMA rejects backtracking-prone regexes (error_code 116,
// "complex validation logic") — no nested groups with quantifiers like
// `(?:-[a-z0-9]+)*`. Keep patterns to simple character classes.
const SLUG = { format: "^[a-z0-9-]+$", error: "Use lowercase letters, numbers and hyphens only (e.g. the-signal)." };
const URL_ABS = { format: "^https?://.+", error: "Enter a full URL starting with http:// or https://" };
const URL_REL = { format: "^(/|https?://).+", error: "Use a site-relative path (/browse) or a full URL." };

// ============================================================
// Tier 1 configuration
// ============================================================

// ---- Global fields (authored once, inherited everywhere) ----
const GLOBAL_FIELDS = {
  title_metadata: [
    { path: "rating", instruction: "Content rating. Use the MPAA scale (G–NC-17) for films and the TV scale (TV-Y–TV-MA) for series." },
    { path: "content_tier", instruction: "free shows to everyone; premium gates the title behind sign-in. Defaults to free.", display_type: "radio", default: "free" },
    { path: "release_date", instruction: "Original theatrical / broadcast release date. Used for sorting and “New” badges." },
    { path: "score", instruction: "Audience score, 0–100. Leave blank if the title is unrated.", min: 0, max: 100 },
  ],
  artwork: [
    { path: "hero_image", instruction: "Landscape key art, min 1920×1080, JPG or WebP, under 1 MB. Shown full-width on the title detail page." },
    { path: "thumbnail", instruction: "Portrait poster, 2:3 ratio (e.g. 600×900), JPG or WebP. Shown in rails, search, and cards." },
  ],
  seo: [
    { path: "meta_title", instruction: "Browser tab + search result title. Aim for 50–60 characters. Falls back to the entry title if blank.", max: 60 },
    { path: "meta_description", instruction: "Search result snippet. Aim for 150–160 characters.", max: 160 },
    { path: "og_image", instruction: "Social share image, 1200×630. Falls back to the hero image if blank." },
    { path: "canonical_url", instruction: "Only set if this content also lives at another URL. Leave blank otherwise.", ...URL_ABS },
  ],
  cta: [
    { path: "label", instruction: "Button text. Keep it short and action-led, e.g. “Watch now”, “Start free trial”." },
    { path: "url", instruction: "Where the button goes. Use a site-relative path (/watch/the-signal) for internal links.", ...URL_REL },
    { path: "style", instruction: "primary = solid brand button, secondary = outlined, ghost = text-only.", display_type: "radio", default: "primary" },
    { path: "open_in_new_tab", instruction: "Enable only for links leaving Flixstack.", default: false },
  ],
  link: [
    { path: "label", instruction: "The text shown in the menu." },
    { path: "href", instruction: "Site-relative path (/browse) or a full URL for external links.", ...URL_REL },
    { path: "open_in_new_tab", instruction: "Enable only for external links.", default: false },
  ],
  availability_window: [
    { path: "available_from", instruction: "Title goes live at this date/time. Leave blank to publish immediately." },
    { path: "available_until", instruction: "Title is hidden after this date/time. Leave blank to keep it available indefinitely." },
    { path: "regions", instruction: "Comma-separated region codes where this title is available (e.g. US, CA, UK). Blank = all regions.", format: "^[A-Z, ]+$", error: "Use 2-letter uppercase region codes separated by commas (e.g. US, CA, UK)." },
  ],
};

// ---- Content types ----
const CONTENT_TYPES = {
  movie: [
    { path: "title", instruction: "Public-facing film title exactly as it should appear on the site." },
    { path: "url", instruction: "Auto-managed page path. Do not edit unless you know the routing implications." },
    { path: "slug", instruction: "URL-safe id, lowercase with hyphens. Must be unique. Changing it breaks existing links and bookmarks.", ...SLUG },
    { path: "synopsis", instruction: "1–3 sentence description shown on the detail page. Required." },
    { path: "runtime", instruction: "Total runtime in whole minutes.", min: 1 },
    { path: "genres", instruction: "One or more genres. Drives genre pages and related rails." },
    { path: "cast", instruction: "Billed cast, in credit order. Link existing People or create new ones." },
    { path: "director", instruction: "The film's director." },
    { path: "trailer_url", instruction: "Full YouTube or Vimeo URL, e.g. https://youtube.com/watch?v=…", ...URL_ABS },
    { path: "taxonomies", instruction: "Themes/moods from the Content Tags vocabulary. Use existing terms; don't invent one-offs." },
  ],
  tv_series: [
    { path: "title", instruction: "Public-facing series title." },
    { path: "slug", instruction: "URL-safe id, lowercase with hyphens. Must be unique. Changing it breaks existing links.", ...SLUG },
    { path: "synopsis", instruction: "1–3 sentence series description shown on the detail page." },
    { path: "genres", instruction: "One or more genres." },
    { path: "cast", instruction: "Main cast, in billing order." },
    { path: "creator", instruction: "Series creator / showrunner." },
    { path: "seasons", instruction: "Add one Season block per season, each with its episodes." },
    { path: "status", instruction: "ongoing = still airing, ended = complete, upcoming = announced, not yet aired.", display_type: "radio", default: "ongoing" },
    { path: "taxonomies", instruction: "Themes/moods from the Content Tags vocabulary." },
    // nested Season block
    { path: "seasons.season_block.season_number", instruction: "Season number, starting at 1.", min: 1 },
    { path: "seasons.season_block.release_date", instruction: "Date this season premiered." },
    { path: "seasons.season_block.episodes", instruction: "Episodes in air order." },
  ],
  episode: [
    { path: "title", instruction: "Episode title." },
    { path: "slug", instruction: "URL-safe id, unique within the series.", ...SLUG },
    { path: "episode_number", instruction: "Episode number within the season, starting at 1.", min: 1 },
    { path: "duration", instruction: "Episode length in whole minutes.", min: 1 },
    { path: "synopsis", instruction: "1–2 sentence episode description." },
    { path: "thumbnail", instruction: "Landscape still, 16:9 (e.g. 1280×720)." },
    { path: "air_date", instruction: "Date this episode first aired." },
  ],
  person: [
    { path: "title", instruction: "Full name as it should be credited." },
    { path: "slug", instruction: "URL-safe id, lowercase with hyphens. Must be unique.", ...SLUG },
    { path: "bio", instruction: "Short biography, 1–2 sentences." },
    { path: "photo", instruction: "Headshot, square (e.g. 400×400), JPG or WebP." },
    { path: "role", instruction: "One or more roles this person is credited for.", display_type: "dropdown" },
  ],
  genre: [
    { path: "title", instruction: "Genre name as shown to viewers, e.g. “Sci-Fi & Fantasy”." },
    { path: "slug", instruction: "URL-safe id, lowercase with hyphens. Must be unique.", ...SLUG },
    { path: "description", instruction: "One-line description shown on the genre page header." },
    { path: "color_accent", instruction: "Brand accent for this genre as a 6-digit hex, e.g. #E50914. Use the colour picker.", format: "^#[0-9a-fA-F]{6}$", error: "Enter a 6-digit hex colour, e.g. #E50914." },
    { path: "hero_image", instruction: "Wide banner for the genre page, min 1920×480." },
  ],
  hero_banner: [
    { path: "title", instruction: "Headline shown over the banner." },
    { path: "subtitle", instruction: "Supporting line under the headline. Keep it short." },
    { path: "background_image", instruction: "Full-bleed landscape image, min 1920×1080. Text sits on the left, so keep that area uncluttered." },
    { path: "badge_text", instruction: "Optional overline, under ~20 chars (e.g. “New Season”).", max: 24 },
    { path: "linked_title", instruction: "The movie or series this banner promotes. Powers the CTA destination." },
  ],
  homepage_rail: [
    { path: "title", instruction: "Row heading shown to viewers, e.g. “Trending Now”. Also how you'll recognise this rail in pickers." },
    { path: "rail_type", instruction: "editorial = you pick the titles by hand; automated = filled by rules.", display_type: "radio", default: "editorial" },
    { path: "items", instruction: "The titles in this row, in display order. Used when rail type is editorial." },
    { path: "layout", instruction: "landscape = wide cards, portrait = poster cards, hero = single large feature.", display_type: "dropdown", default: "landscape" },
  ],
  page: [
    { path: "title", instruction: "Internal page name (also used for SEO fallback)." },
    { path: "slug", instruction: "URL-safe id, lowercase with hyphens. Must be unique.", ...SLUG },
    { path: "sections", instruction: "Build the page by stacking Hero, Rail, Promo, and Genre Spotlight blocks in display order." },
    // block-level guidance
    { path: "sections.hero_block.hero_banners", instruction: "Full-width hero banner(s) at the top of the page." },
    { path: "sections.rail_block.rail", instruction: "Embeds an existing Homepage Rail." },
    { path: "sections.promo_block.layout", instruction: "left/right places the image on that side; center stacks it above the text.", display_type: "radio" },
    { path: "sections.genre_spotlight_block.genre", instruction: "The genre to highlight." },
    { path: "sections.genre_spotlight_block.items", instruction: "Hand-picked titles to feature for this genre." },
  ],
  header: [
    { path: "title", instruction: "Internal name for this header configuration." },
    { path: "logo", instruction: "Site logo, SVG or transparent PNG, max height 40px display." },
    { path: "main_navigation", instruction: "The primary menu shown in the header." },
    { path: "show_search", instruction: "Show the search icon in the header.", default: true },
    { path: "show_profile", instruction: "Show the profile icon in the header.", default: true },
  ],
  footer: [
    { path: "title", instruction: "Internal name for this footer configuration." },
    { path: "columns", instruction: "Footer link columns, left to right. Each column has a heading and a set of links." },
    { path: "columns.heading", instruction: "Column title, e.g. “Company”." },
    { path: "columns.links", instruction: "Navigation entries listed under this column." },
    { path: "legal_text", instruction: "Copyright / legal line shown at the very bottom." },
  ],
  navigation: [
    { path: "title", instruction: "Internal name for this menu, e.g. “Primary Nav” or “Footer – Company”." },
    { path: "links", instruction: "Menu items in display order." },
  ],
  site_config: [
    { path: "site_name", instruction: "Site name used in titles and metadata." },
    { path: "feature_flags", instruction: "Toggles that turn app features on/off. Only add keys the app checks — see the Setup Guide." },
    { path: "feature_flags.key", instruction: "Exact flag key (e.g. enable_search). A typo silently disables the feature." },
    { path: "feature_flags.enabled", instruction: "On/off for this flag." },
  ],
  setup_guide: [
    { path: "badge_label", instruction: "Small label shown above the guide title." },
    { path: "steps", instruction: "Ordered setup steps." },
    { path: "features", instruction: "Feature highlights, each anchored for deep-linking." },
    { path: "features.anchor_id", instruction: "URL-safe anchor, lowercase-hyphenated, must be unique on the page.", format: "^[a-z0-9-]+$", error: "Use lowercase letters, numbers and hyphens only." },
    { path: "features.icon", instruction: "One of: database, layers, zap, tags, users, bot." },
  ],
};

// ---- Alt-text field additions (phase `alt`) ----
const altField = (uid, forImage) => ({
  display_name: `${forImage} Alt Text`,
  uid,
  data_type: "text",
  field_metadata: { instruction: "Describe the image for screen readers and when it fails to load. Required.", default_value: "" },
  multiple: false, mandatory: false, unique: false, non_localizable: false,
});
// content type -> [ [alt_uid, after_image_uid, label], ... ]
const ALT_TARGETS = {
  genre: [["hero_image_alt", "hero_image", "Hero Image"]],
  hero_banner: [["background_image_alt", "background_image", "Background Image"]],
  person: [["photo_alt", "photo", "Photo"]],
  header: [["logo_alt", "logo", "Logo"]],
  episode: [["thumbnail_alt", "thumbnail", "Thumbnail"]],
};
const ALT_GLOBAL = { artwork: [["hero_image_alt", "hero_image", "Hero Image"], ["thumbnail_alt", "thumbnail", "Thumbnail"]] };

// ============================================================
// Phases
// ============================================================

async function runFields() {
  console.log("\n== Phase: field help text + validation + defaults + display types ==");

  console.log("  -- global fields --");
  for (const [uid, rows] of Object.entries(GLOBAL_FIELDS)) {
    try {
      const gf = await getGF(uid);
      const { ok, miss } = applyRows(gf.schema, rows, uid);
      await putGF(gf);
      console.log(`  ${uid}: ${ok} fields set${miss ? `, ${miss} missing` : ""}`);
    } catch (e) { console.log(`  ! ${uid}:`, e.status || e.message); }
  }

  console.log("  -- content types --");
  for (const [uid, rows] of Object.entries(CONTENT_TYPES)) {
    try {
      const ct = await getCT(uid);
      const { ok, miss } = applyRows(ct.schema, rows, uid);
      await putCT(ct);
      console.log(`  ${uid}: ${ok} fields set${miss ? `, ${miss} missing` : ""}`);
    } catch (e) { console.log(`  ! ${uid}:`, e.status || e.message); }
  }
}

async function runAlt() {
  console.log("\n== Phase: add companion alt-text fields ==");

  // artwork global field
  for (const [gfUid, targets] of Object.entries(ALT_GLOBAL)) {
    try {
      const gf = await getGF(gfUid);
      let added = 0;
      for (const [altUid, afterUid, label] of targets) {
        if (hasField(gf.schema, altUid)) continue;
        insertAfter(gf.schema, afterUid, altField(altUid, label));
        added++;
      }
      if (added) { await putGF(gf); }
      console.log(`  ${gfUid}: +${added} alt field(s)`);
    } catch (e) { console.log(`  ! ${gfUid}:`, e.status || e.message); }
  }

  for (const [ctUid, targets] of Object.entries(ALT_TARGETS)) {
    try {
      const ct = await getCT(ctUid);
      let added = 0;
      for (const [altUid, afterUid, label] of targets) {
        if (hasField(ct.schema, altUid)) continue;
        insertAfter(ct.schema, afterUid, altField(altUid, label));
        added++;
      }
      if (added) { await putCT(ct); }
      console.log(`  ${ctUid}: +${added} alt field(s)`);
    } catch (e) { console.log(`  ! ${ctUid}:`, e.status || e.message); }
  }
  console.log("  NOTE: alt fields are optional. Backfill existing entries, then set mandatory:true.");
}

// episode.synopsis: single-line text -> JSON RTE ("advanced"), matching movie/tv_series.
// Changing a field's data_type can drop existing string values, so this phase is
// separate from `all`. Back up / re-enter episode synopses after running.
const uid16 = () => randomUUID().replace(/-/g, "").slice(0, 16);
function runRte() {
  return (async () => {
    console.log("\n== Phase: episode.synopsis -> JSON RTE (advanced) ==");
    console.log("  ⚠  This changes a data type. Existing plain-text synopses may be dropped —");
    console.log("     export episode entries first and re-enter synopsis text afterward.");
    const ct = await getCT("episode");
    const cur = ct.schema.find((f) => f.uid === "synopsis");
    if (cur && cur.data_type === "json") { console.log("  episode.synopsis: already JSON RTE"); return; }
    ct.schema = ct.schema.map((f) => (f.uid === "synopsis" ? {
      display_name: "Synopsis",
      uid: "synopsis",
      data_type: "json",
      field_metadata: { allow_json_rte: true, rich_text_type: "advanced", embed_objects: [], options: [], multiline: false, ref_multiple_content_types: true, instruction: "1–2 sentence episode description." },
      reference_to: ["sys_assets"],
      multiple: false, mandatory: false, unique: false, non_localizable: false,
    } : f));
    await putCT(ct);
    console.log("  episode.synopsis: converted to JSON RTE");
  })();
}

// ---- main --------------------------------------------------
const phase = (process.argv.slice(2).find((a) => !a.startsWith("-")) || "fields").toLowerCase();
const run = {
  fields: runFields,
  alt: runAlt,
  rte: runRte,
  all: async () => { await runFields(); await runAlt(); },
};

console.log(`\n🎬 Flixstack editor-field config  (branch: ${BRANCH}, region: ${REGION}, phase: ${phase}${DRY ? ", DRY-RUN — no writes" : ""})`);
(run[phase] || (() => { console.error("unknown phase:", phase, "\nexpected: fields | alt | rte | all"); process.exit(1); }))()
  .then(() => console.log(`\n✓ Done: ${phase}\n`))
  .catch((e) => { console.error("\n✗ FAILED:", e.message); process.exit(1); });
