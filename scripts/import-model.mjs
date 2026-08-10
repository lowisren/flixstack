#!/usr/bin/env node
// ============================================================
// Flixstack — content model bootstrap
//
// Creates the content model in an empty stack straight from
// content-models/export.json: 7 global fields, then 13 content types.
//
// This is the missing first step of a clean rebuild. export.json is a plain
// { content_types, global_fields } document, NOT a `csdx cm:stacks:export`
// bundle, so it can't be fed to the CLI or the stack UI importer — it has to
// be POSTed to the CMA, which is what this does.
//
// Reference ordering resolves itself: content types are attempted in rounds,
// and any that fail (because something they reference doesn't exist yet) are
// retried on the next round. The loop stops when a full round makes no
// progress, so a genuine schema error surfaces instead of spinning.
//
// Usage (alias: `npm run import-model -- <phase> [--dry]`):
//   node scripts/import-model.mjs [global-fields|content-types|all] [--dry] [--update]
//     --dry    : read + print planned writes, make NO writes (existence checks
//                still run, so a dry run tells you what is already there)
//     --update : PUT over global fields / content types that already exist
//                (default is skip — see the warning below)
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Override the env file with ENV_FILE=.env.other (repo-root-relative or absolute).
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION and NEXT_PUBLIC_CONTENTSTACK_BRANCH.
//
// WARNING ON --update: changing a content type's schema drops the data held in
// any field that disappears — the ordering trap documented in
// content-models/MIGRATION_STATUS.md. Safe on an empty stack; think first on a
// populated one.
// ============================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---- env ---------------------------------------------------
// .env.local by default; set ENV_FILE (repo-root-relative, or absolute) to point
// this script at a different stack without swapping the file on disk.
const ENV_FILE = resolve(dirname(fileURLToPath(import.meta.url)), "..", process.env.ENV_FILE ?? ".env.local");

for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION || "US").toUpperCase();
const BRANCH = process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH || "main";

const args = process.argv.slice(2);
const DRY = args.includes("--dry") || process.env.DRY === "1";
const UPDATE = args.includes("--update");
const phase = args.find((a) => !a.startsWith("--")) || "all";

if (!["global-fields", "content-types", "all"].includes(phase)) {
  console.error(`Unknown phase "${phase}". Use: global-fields | content-types | all`);
  process.exit(1);
}
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

const MODEL = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../content-models/export.json"), "utf8")
);

// ---- CMA helper --------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// taxonomy endpoints are stack-level (no branch header); everything else is branch-scoped.
async function cma(method, path, body, { taxonomy = false } = {}) {
  const headers = { api_key: API_KEY, authorization: MGMT, "Content-Type": "application/json" };
  if (!taxonomy) headers.branch = BRANCH;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (res.ok) return json;
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    const err = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
}

async function exists(kind, uid) {
  try {
    await cma("GET", `/${kind}/${uid}`);
    return true;
  } catch (e) {
    if (e.status === 404 || e.status === 422) return false;
    throw e;
  }
}

/** Trim a CMA error down to the part that says what's actually wrong. */
const why = (e) => {
  const errs = e.body?.errors;
  if (errs && typeof errs === "object") {
    return Object.entries(errs).map(([k, v]) => `${k}: ${[].concat(v).join(" ")}`).join("; ");
  }
  return e.body?.error_message || e.message;
};

// ---- taxonomy preflight ------------------------------------
// A content type carrying a taxonomy field can't be created until that taxonomy
// exists. That's a hard dependency, not an ordering one, so the retry loop can't
// resolve it — catch it up front with an actionable message instead.
function taxonomyUidsInModel() {
  const walk = (schema) =>
    schema.flatMap((f) => [
      f,
      ...(f.schema ? walk(f.schema) : []),
      ...(f.blocks ? f.blocks.flatMap((b) => walk(b.schema)) : []),
    ]);
  const uids = new Set();
  for (const ct of MODEL.content_types) {
    for (const f of walk(ct.schema)) {
      if (f.data_type === "taxonomy") for (const t of f.taxonomies ?? []) uids.add(t.taxonomy_uid);
    }
  }
  return [...uids];
}

async function checkTaxonomies() {
  const needed = taxonomyUidsInModel();
  if (!needed.length) return;

  const missing = [];
  for (const uid of needed) {
    try {
      await cma("GET", `/taxonomies/${uid}`, null, { taxonomy: true });
    } catch (e) {
      if (e.status === 404 || e.status === 422) missing.push(uid);
      else throw e;
    }
  }
  if (!missing.length) {
    console.log(`  taxonomies present: ${needed.join(", ")}`);
    return;
  }
  const msg =
    `taxonomy ${missing.map((u) => `"${u}"`).join(", ")} does not exist in this stack.\n` +
    `     movie and tv_series both carry a taxonomy field bound to it, so they cannot\n` +
    `     be created yet. Run this first:\n\n` +
    `       ${process.env.ENV_FILE ? `ENV_FILE=${process.env.ENV_FILE} ` : ""}node scripts/migrate-v2.mjs terms\n`;
  if (DRY) {
    console.log(`  ⚠  ${msg}`);
  } else {
    console.error(`\n❌  ${msg}`);
    process.exit(1);
  }
}

// ---- Phase 1: global fields --------------------------------
// No global field in the model embeds another, so a single pass is enough.
async function importGlobalFields() {
  console.log("\n== Phase: global fields ==");
  let created = 0, skipped = 0, updated = 0;

  for (const gf of MODEL.global_fields) {
    const body = { global_field: { title: gf.title, uid: gf.uid, description: gf.description, schema: gf.schema } };
    const present = await exists("global_fields", gf.uid); // a read — runs under --dry too

    if (present && !UPDATE) {
      console.log(`  · ${gf.uid} (exists)`);
      skipped++;
    } else if (present) {
      if (!DRY) await cma("PUT", `/global_fields/${gf.uid}`, body);
      console.log(`  ${DRY ? "[dry] update" : "↻"} ${gf.uid}`);
      updated++;
    } else {
      if (!DRY) await cma("POST", `/global_fields`, body);
      console.log(`  ${DRY ? "[dry] create" : "✓"} ${gf.uid}`);
      created++;
    }
  }
  console.log(`  global fields: created ${created}, updated ${updated}, skipped ${skipped}, total ${MODEL.global_fields.length}`);
}

// ---- Phase 2: content types --------------------------------
// Retry in rounds until no further progress: a content type whose reference_to
// targets a type that doesn't exist yet simply fails and is picked up next round.
async function importContentTypes() {
  console.log("\n== Phase: content types ==");
  await checkTaxonomies();

  let pending = [...MODEL.content_types];
  let created = 0, skipped = 0, updated = 0, round = 0;
  const lastError = new Map();

  while (pending.length) {
    round++;
    const deferred = [];
    let progress = 0;

    for (const ct of pending) {
      const body = {
        content_type: {
          title: ct.title, uid: ct.uid, schema: ct.schema,
          description: ct.description, options: ct.options,
        },
      };
      try {
        const present = await exists("content_types", ct.uid); // a read — runs under --dry too

        if (present && !UPDATE) {
          console.log(`  · ${ct.uid} (exists)`);
          skipped++;
        } else if (present) {
          if (!DRY) await cma("PUT", `/content_types/${ct.uid}`, body);
          console.log(`  ${DRY ? "[dry] update" : "↻"} ${ct.uid}`);
          updated++;
        } else {
          if (!DRY) await cma("POST", `/content_types`, body);
          console.log(`  ${DRY ? "[dry] create" : "✓"} ${ct.uid}${DRY ? "" : `  (round ${round})`}`);
          created++;
        }
        progress++;
      } catch (e) {
        lastError.set(ct.uid, e);
        deferred.push(ct);
      }
    }

    if (deferred.length) {
      console.log(`  … ${deferred.length} deferred to round ${round + 1}: ${deferred.map((c) => c.uid).join(", ")}`);
    }
    // No progress this round means the remainder is blocked on something the
    // retry loop can't fix — stop and report rather than loop forever.
    if (progress === 0) break;
    pending = deferred;
  }

  console.log(`  content types: created ${created}, updated ${updated}, skipped ${skipped}, total ${MODEL.content_types.length}`);

  if (pending.length) {
    console.error(`\n❌  ${pending.length} content type(s) could not be created after ${round} round(s):`);
    for (const ct of pending) console.error(`   ${ct.uid}: ${why(lastError.get(ct.uid))}`);
    return false;
  }
  return true;
}

// ---- main --------------------------------------------------
(async () => {
  console.log(
    `\n🧱 Flixstack model import  (region: ${REGION}, branch: ${BRANCH}, phase: ${phase}` +
      `${DRY ? ", DRY-RUN — no writes" : ""}${UPDATE ? ", UPDATE existing" : ""})`
  );
  console.log(`Stack: ${API_KEY}`);

  let ok = true;
  if (phase === "global-fields" || phase === "all") await importGlobalFields();
  if (phase === "content-types" || phase === "all") ok = await importContentTypes();

  if (!ok) process.exit(1);

  console.log(`\n✅  model import complete\n`);
  if (!DRY) {
    console.log("Next steps:");
    console.log("  1. node scripts/migrate-v2.mjs terms   # taxonomy vocabulary, if not already seeded");
    console.log("  2. npm run seed                           # 77 entries, draft");
    console.log("  3. npm run upload-assets                  # images, linked to those entries\n");
  }
})().catch((err) => {
  console.error("\n❌  Model import failed:", err.message);
  process.exit(1);
});
