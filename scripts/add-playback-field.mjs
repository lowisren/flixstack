#!/usr/bin/env node
// ============================================================
// Flixstack — add `playback` global field to movie + episode
//
// Idempotent & re-runnable. Mirrors the CMA patterns in migrate-v2.mjs.
//   - Creates the `playback` global field (video_url + video_file fallback,
//     poster, and a repeatable captions group) — skips if it already exists.
//   - Adds a `playback` global-field reference to the `movie` schema
//     (before `title_metadata`) and to `episode` (before `air_date`).
//     Skips either content type if the field is already present.
//
// This is the runnable counterpart to the change already written into
// content-models/export.json. It is NOT run automatically — run it yourself:
//
//   node scripts/add-playback-field.mjs
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Optional: MIGRATE_BRANCH (defaults to "main").
// ============================================================

import { readFileSync } from "node:fs";

// ---- env ---------------------------------------------------
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const BRANCH = process.env.MIGRATE_BRANCH || "main";
const BASE = "https://api.contentstack.io/v3";

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN");
  process.exit(1);
}

// ---- CMA helper --------------------------------------------
async function cma(method, path, body, { branch = BRANCH } = {}) {
  const headers = {
    api_key: API_KEY,
    authorization: MGMT,
    "Content-Type": "application/json",
    branch,
  };
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

// ---- field builders ----------------------------------------
const base = (o) => ({ multiple: false, mandatory: false, unique: false, non_localizable: false, ...o });

const captionsSchema = [
  base({ display_name: "Label", uid: "label", data_type: "text" }),
  base({ display_name: "Language", uid: "srclang", data_type: "text", field_metadata: { description: "BCP-47 code, e.g. en, es", default_value: "" } }),
  base({ display_name: "VTT File", uid: "vtt_file", data_type: "file" }),
];

const playbackSchema = () => [
  base({ display_name: "Video URL", uid: "video_url", data_type: "text", field_metadata: { description: "HLS (.m3u8) or MP4 URL. Preferred over the uploaded file when both are set.", default_value: "" } }),
  base({ display_name: "Video File", uid: "video_file", data_type: "file" }),
  base({ display_name: "Poster", uid: "poster", data_type: "file" }),
  base({ display_name: "Captions", uid: "captions", data_type: "group", multiple: true, field_metadata: { description: "", instruction: "" }, schema: JSON.parse(JSON.stringify(captionsSchema)) }),
];

// global-field reference field inserted into a content-type schema
const playbackRef = () => base({ display_name: "Playback", uid: "playback", data_type: "global_field", reference_to: "playback" });

const has = (schema, uid) => schema.some((f) => f.uid === uid);
function insertBefore(schema, beforeUid, field) {
  const i = schema.findIndex((f) => f.uid === beforeUid);
  if (i === -1) return [...schema, field];
  return [...schema.slice(0, i), field, ...schema.slice(i)];
}

// ---- global field ------------------------------------------
async function ensureGlobalField() {
  console.log("\n== playback global field ==");
  try {
    await cma("GET", "/global_fields/playback");
    console.log("  playback: already exists");
    return;
  } catch (e) {
    if (e.status !== 404 && e.status !== 422) throw e;
  }
  await cma("POST", "/global_fields", {
    global_field: {
      title: "Playback",
      uid: "playback",
      description: "Playable video source (external URL or uploaded file) for a movie or episode.",
      schema: playbackSchema(),
    },
  });
  console.log("  playback: created");
}

// ---- content types -----------------------------------------
async function getCT(uid) {
  const r = await cma("GET", `/content_types/${uid}`);
  return r.content_type;
}
async function putCT(ct, schema) {
  const body = { content_type: { title: ct.title, uid: ct.uid, schema, options: ct.options, description: ct.description } };
  if (ct.field_rules) body.content_type.field_rules = ct.field_rules;
  await cma("PUT", `/content_types/${ct.uid}`, body);
}

async function addToContentType(uid, beforeUid) {
  const ct = await getCT(uid);
  if (has(ct.schema, "playback")) {
    console.log(`  ${uid}: already has playback`);
    return;
  }
  const schema = insertBefore(ct.schema, beforeUid, playbackRef());
  await putCT(ct, schema);
  console.log(`  ${uid}: added playback${has(ct.schema, beforeUid) ? ` before ${beforeUid}` : " (appended)"}`);
}

// ---- run ---------------------------------------------------
async function main() {
  console.log(`Branch: ${BRANCH}`);
  await ensureGlobalField();
  console.log("\n== content types ==");
  await addToContentType("movie", "title_metadata");
  await addToContentType("episode", "air_date");
  console.log("\nDone. Remember to publish affected entries after adding playback data.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
