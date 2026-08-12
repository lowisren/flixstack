#!/usr/bin/env node
// ============================================================
// Flixstack — split `link` into a dedicated `nav_link` global field
//
// See docs/navigation-model-fix-plan.md § Phase 3.
//
// The `link` global field is doing double duty: it backs navigation menu
// items AND setup_guide doc links (steps.docs_link, features.learn_link,
// doc_links.link). Those need different rules — a menu item without a label
// or href is broken content, while an empty setup_guide link is legitimately
// optional. That conflict is why `link.href` cannot simply be made mandatory.
//
// So: navigation.links moves to its own `nav_link` global field with
// label + href mandatory, and `link` stays optional for setup_guide.
//
// `nav_link` is DERIVED FROM the live `link` schema, so it inherits the URL
// regex from customize-editor-fields.mjs rather than duplicating it. That
// script also has a `nav_link` block, so both stay in sync on later runs.
//
// Subfield uids are identical (label / href / open_in_new_tab), so stored
// entry data is wire-compatible and the frontend types do not change.
//
// Idempotent & re-runnable. Phases:
//   backup  : write navigation entries to logs/ (always runs first)
//   gf      : create the `nav_link` global field
//   ct      : repoint navigation.links -> nav_link, + mandatory/min_instance
//   verify  : re-read entries and confirm no link data was dropped
//   all     : all of the above  (default)
//   --dry   : read + print planned changes, write nothing
//
// Usage:
//   node scripts/split-nav-link.mjs [all|backup|gf|ct|verify] [--dry]
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION and NEXT_PUBLIC_CONTENTSTACK_BRANCH.
// Override the env file with ENV_FILE=.env.other (repo-root-relative or absolute).
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, process.env.ENV_FILE ?? ".env.local");

for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
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
    headers: {
      api_key: API_KEY,
      authorization: MGMT,
      branch: BRANCH,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = new Error(json.error_message || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

const getGF = async (uid) => (await cma("GET", `/global_fields/${uid}`)).global_field;
const getCT = async (uid) => (await cma("GET", `/content_types/${uid}`)).content_type;

async function getNavEntries() {
  const out = [];
  for (let skip = 0; ; skip += 100) {
    const res = await cma("GET", `/content_types/navigation/entries?limit=100&skip=${skip}&include_count=true`);
    const batch = res.entries ?? [];
    out.push(...batch);
    if (batch.length < 100 || out.length >= (res.count ?? 0)) break;
  }
  return out;
}

// ---- backup ------------------------------------------------
// Repointing a global-field reference is the one step here that could plausibly
// drop entry data. Snapshot first so `verify` has something to restore from.
const BACKUP = resolve(ROOT, "logs", "navigation-entries-backup.json");

async function runBackup() {
  const entries = await getNavEntries();
  const snapshot = entries.map((e) => ({ uid: e.uid, title: e.title, links: e.links ?? [] }));
  const total = snapshot.reduce((n, e) => n + e.links.length, 0);

  // Guard: after `ct` runs, live entries report zero links until `restore`
  // writes them back. Re-running `all` at that point would otherwise clobber
  // the only good copy with an empty snapshot.
  if (existsSync(BACKUP)) {
    const prior = JSON.parse(readFileSync(BACKUP, "utf8"));
    const priorTotal = prior.reduce((n, e) => n + (e.links?.length ?? 0), 0);
    if (priorTotal > total) {
      console.log(`  backup: keeping existing snapshot (${priorTotal} links) — live stack reports only ${total}, refusing to overwrite`);
      return prior;
    }
  }

  if (!DRY) {
    mkdirSync(resolve(ROOT, "logs"), { recursive: true });
    writeFileSync(BACKUP, JSON.stringify(snapshot, null, 2));
  }
  console.log(`  backup: ${snapshot.length} navigation entries, ${total} links -> ${DRY ? "(dry, not written)" : "logs/navigation-entries-backup.json"}`);
  return snapshot;
}

// ---- global field ------------------------------------------
// Mandatory on the menu-item subfields; `link` itself is left untouched so
// setup_guide's optional links keep working.
const MANDATORY = { label: true, href: true, open_in_new_tab: false };

async function runGF() {
  try {
    await getGF("nav_link");
    console.log("  gf: nav_link already exists — skipping create");
    return;
  } catch (e) {
    if (e.status !== 404 && e.status !== 422) throw e;
  }

  // Derive from the live `link` schema so the URL regex has a single source.
  const link = await getGF("link");
  const schema = link.schema.map((f) => ({
    ...JSON.parse(JSON.stringify(f)),
    mandatory: MANDATORY[f.uid] ?? false,
  }));

  console.log("  gf: creating nav_link from link with mandatory label + href");
  for (const f of schema) console.log(`      · ${f.uid.padEnd(18)} mandatory=${f.mandatory}${f.format ? `  format=${f.format}` : ""}`);
  if (DRY) return;

  await cma("POST", "/global_fields", {
    global_field: {
      title: "Nav Link",
      uid: "nav_link",
      description: "A navigation menu item. Label and href are required — an unlabelled or hrefless menu item renders as a broken, unnamed link.",
      schema,
    },
  });
}

// ---- content type ------------------------------------------
async function runCT() {
  const ct = await getCT("navigation");
  const links = ct.schema.find((f) => f.uid === "links");
  if (!links) { console.log("  ! ct: navigation has no `links` field"); return; }

  const before = { reference_to: links.reference_to, mandatory: links.mandatory, min_instance: links.min_instance };
  links.reference_to = "nav_link";
  links.mandatory = true;
  links.min_instance = 1;
  // The CMA rejects a global-field reference that carries an inline schema.
  delete links.schema;

  console.log(`  ct: navigation.links  ${JSON.stringify(before)}  ->  ${JSON.stringify({ reference_to: "nav_link", mandatory: true, min_instance: 1 })}`);
  if (DRY) return;

  await cma("PUT", "/content_types/navigation", {
    content_type: {
      title: ct.title, uid: ct.uid, schema: ct.schema,
      options: ct.options, description: ct.description,
      ...(ct.field_rules ? { field_rules: ct.field_rules } : {}),
    },
  });
}

// ---- restore -----------------------------------------------
// Repointing `reference_to` makes Contentstack stop projecting the field: the
// entry document is untouched (_version and updated_at do not move) but `links`
// vanishes from every API response. The data has to be written back explicitly
// against the new field. This is NOT optional — it is part of the migration.
//
// _metadata.uid is preserved per item so the stable per-link uids survive
// (the nav component keys off them — see docs Phase 4).
async function runRestore(snapshot) {
  const before = snapshot ?? JSON.parse(readFileSync(BACKUP, "utf8"));
  const after = await getNavEntries();
  let restored = 0, skipped = 0;

  for (const b of before) {
    const live = after.find((x) => x.uid === b.uid);
    if (!live) { console.log(`  ! restore: entry ${b.uid} (${b.title}) no longer exists`); continue; }
    if (JSON.stringify(live.links ?? []) === JSON.stringify(b.links)) { skipped++; continue; }

    console.log(`  restore: ${b.title} <- ${b.links.length} link(s)`);
    if (DRY) continue;
    await cma("PUT", `/content_types/navigation/entries/${b.uid}`, { entry: { title: b.title, links: b.links } });
    restored++;
  }
  console.log(`  restore: ${restored} entry/entries rewritten, ${skipped} already intact`);
}

// ---- verify ------------------------------------------------
async function runVerify(snapshot) {
  const ct = await getCT("navigation");
  const links = ct.schema.find((f) => f.uid === "links");
  console.log(`  verify: navigation.links -> ${links?.reference_to}  mandatory=${links?.mandatory}  min_instance=${links?.min_instance}`);

  const before = snapshot ?? JSON.parse(readFileSync(BACKUP, "utf8"));
  const after = await getNavEntries();
  let lost = 0;
  for (const b of before) {
    const a = after.find((x) => x.uid === b.uid);
    const got = a?.links ?? [];
    if (JSON.stringify(got) !== JSON.stringify(b.links)) {
      lost++;
      console.log(`  ✗ ${b.title}: ${b.links.length} link(s) before, ${got.length} after`);
    }
  }
  console.log(lost
    ? `\n  ✗ ${lost} entry/entries lost link data — restore from logs/navigation-entries-backup.json`
    : `  verify: all ${before.length} entries kept their links intact ✓`);
  return lost;
}

// ---- main --------------------------------------------------
const phase = (process.argv.slice(2).find((a) => !a.startsWith("-")) || "all").toLowerCase();
console.log(`\n🎬 Flixstack nav_link split  (branch: ${BRANCH}, region: ${REGION}, phase: ${phase}${DRY ? ", DRY-RUN — no writes" : ""})\n`);

const run = {
  backup: runBackup,
  gf: runGF,
  ct: runCT,
  restore: () => runRestore(null),
  verify: () => runVerify(null),
  all: async () => {
    // backup BEFORE ct: repointing reference_to de-projects `links`, so the
    // snapshot is the only copy until restore writes it back.
    const snapshot = await runBackup();
    await runGF();
    await runCT();
    await runRestore(snapshot);
    if (!DRY) await runVerify(snapshot);
  },
};

(run[phase] || (() => { console.error("unknown phase:", phase, "\nexpected: all | backup | gf | ct | verify"); process.exit(1); }))()
  .then(() => console.log(`\n✓ Done: ${phase}\n`))
  .catch((e) => { console.error("\n✗ FAILED:", e.message, e.payload ? JSON.stringify(e.payload.errors ?? e.payload) : ""); process.exit(1); });
