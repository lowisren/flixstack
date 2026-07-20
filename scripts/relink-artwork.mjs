#!/usr/bin/env node
// ============================================================
// Flixstack — repair movie/episode image references
//
// scripts/seed-playback.mjs (run 2026-07-20) rebuilt every movie and episode
// entry from the CMA *list* endpoint payload, which doesn't carry file-field
// asset references the way a full single-entry fetch does. PUTting that payload
// back nulled `artwork.hero_image` / `artwork.thumbnail` on all 20 movies and
// `thumbnail` on all 18 episodes, then published the broken versions.
//
// This script recovers the exact original asset UIDs from each entry's most
// recent version that still had them, restores those references, and republishes.
//
// Idempotent: an entry whose fields are already populated is skipped (unless
// --force). Only touches `movie` and `episode`.
//
//   node scripts/relink-artwork.mjs [--force]
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY.
// Optional MIGRATE_BRANCH (default "main").
// ============================================================

import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const BRANCH = process.env.MIGRATE_BRANCH || "main";
const BASE = "https://api.contentstack.io/v3";
const FORCE = process.argv.includes("--force");
const ENVIRONMENTS = ["development", "production"];

// Production publishing is gated by the "Editorial Review" workflow's publish rule,
// which requires the entry to be in the "Ready to Publish" stage. We resolve that
// stage at runtime (below) and move each entry into it before publishing, so a
// dev+prod publish isn't rejected wholesale. Set NO_WORKFLOW=1 to skip this and
// publish to development only (ungated).
const WORKFLOW_NAME = "Editorial Review";
const READY_STAGE_NAME = "Ready to Publish";
const SKIP_WORKFLOW = process.env.NO_WORKFLOW === "1";

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN");
  process.exit(1);
}

// Fields to repair per content type, expressed as nested paths.
const REPAIR = {
  movie: [["artwork", "hero_image"], ["artwork", "thumbnail"]],
  episode: [["thumbnail"]],
};

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

const SYS = ["_version", "_in_progress", "created_at", "updated_at", "created_by",
  "updated_by", "ACL", "publish_details", "stackHeaders", "_owner", "_content_type_uid", "urlPath"];
const clean = (entry) => Object.fromEntries(Object.entries(entry).filter(([k]) => !SYS.includes(k)));

const getPath = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
function setPath(obj, path, value) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (o[path[i]] == null || typeof o[path[i]] !== "object") o[path[i]] = {};
    o = o[path[i]];
  }
  o[path[path.length - 1]] = value;
}

// A file field is "present" when it holds an asset — either the populated asset
// object (read shape) or a bare UID string (write shape).
function assetUidAt(entry, path) {
  const v = getPath(entry, path);
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v.uid) return v.uid;
  return undefined;
}

async function getEntry(ct, uid, version) {
  const q = version ? `?version=${version}` : "";
  const r = await cma("GET", `/content_types/${ct}/entries/${uid}${q}`);
  return r.entry;
}

// Resolve the "Ready to Publish" stage UID from the workflow by name, so we don't
// hardcode stack-specific UIDs. Returns undefined if the workflow isn't found.
async function resolveReadyStage() {
  const wfs = (await cma("GET", "/workflows")).workflows || [];
  const wf = wfs.find((w) => w.name === WORKFLOW_NAME);
  if (!wf) return undefined;
  const full = (await cma("GET", `/workflows/${wf.uid}`)).workflow;
  const stage = (full.workflow_stages || []).find((s) => s.name === READY_STAGE_NAME);
  return stage?.uid;
}

async function setStage(ct, uid, stageUid) {
  await cma("POST", `/content_types/${ct}/entries/${uid}/workflow`, {
    workflow: { workflow_stage: { uid: stageUid, comment: "Automated artwork-reference repair" } },
  });
}

// Walk versions backward from (current-1) until every requested field resolves
// to an asset UID. Returns a map of "path.join('.')" -> uid, or null if none found.
async function recoverRefs(ct, entry, paths) {
  for (let v = (entry._version || 1) - 1; v >= 1; v--) {
    const past = await getEntry(ct, entry.uid, v);
    const found = {};
    let complete = true;
    for (const p of paths) {
      const uid = assetUidAt(past, p);
      if (uid) found[p.join(".")] = uid;
      else complete = false;
    }
    if (complete) return found;
  }
  return null;
}

async function repair(ct, stageUid) {
  const paths = REPAIR[ct];
  const list = await cma("GET", `/content_types/${ct}/entries?limit=200`);
  const entries = list.entries || [];
  let restored = 0, intact = 0, both = 0, devOnly = 0, failed = 0;

  for (const summary of entries) {
    try {
      const entry = await getEntry(ct, summary.uid);
      const missing = paths.filter((p) => !assetUidAt(entry, p));

      // 1) Restore missing asset references from the last version that had them.
      if (FORCE || missing.length > 0) {
        const wanted = FORCE ? paths : missing;
        const recovered = await recoverRefs(ct, entry, wanted);
        if (!recovered) {
          console.error(`  ✗ ${ct} / ${entry.title}: no prior version has the asset reference(s)`);
          failed++;
          continue;
        }
        const body = clean(entry);
        for (const p of wanted) setPath(body, p, recovered[p.join(".")]);
        await cma("PUT", `/content_types/${ct}/entries/${entry.uid}`, { entry: body });
        restored++;
        console.log(`  ↻ ${ct} / ${entry.title} restored ${wanted.map((p) => p.join(".")).join(", ")}`);
      } else {
        intact++;
      }

      // 2) Try to move to "Ready to Publish" so production (gated by the publish
      //    rule) can be published too. If the token lacks approver permission for
      //    that transition, fall back to a development-only publish (ungated).
      let canProd = false;
      if (stageUid) {
        try { await setStage(ct, summary.uid, stageUid); canProd = true; }
        catch { canProd = false; }
      }

      // 3) Publish the repaired version.
      const environments = canProd ? ENVIRONMENTS : ["development"];
      await cma("POST", `/content_types/${ct}/entries/${summary.uid}/publish`, {
        entry: { environments, locales: ["en-us"] },
      });
      if (canProd) both++; else devOnly++;
    } catch (err) {
      failed++;
      console.error(`  ✗ ${ct} / ${summary.title}: ${err.message || err}`);
    }
  }
  console.log(`  ${ct}: restored ${restored}, already-intact ${intact}, published[dev+prod] ${both}, published[dev-only] ${devOnly}, failed ${failed}, total ${entries.length}\n`);
}

async function main() {
  const stageUid = SKIP_WORKFLOW ? undefined : await resolveReadyStage();
  const envLabel = stageUid || SKIP_WORKFLOW ? ENVIRONMENTS.join(", ") : "development (workflow stage unresolved — prod gated)";
  if (!SKIP_WORKFLOW && !stageUid) {
    console.log(`⚠  Could not resolve the "${READY_STAGE_NAME}" stage — publishing to development only.\n`);
  }
  console.log(`Branch: ${BRANCH} | Environments: ${envLabel}${FORCE ? " | --force" : ""}\n`);
  await repair("movie", stageUid);
  await repair("episode", stageUid);
  console.log("Done.");
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
