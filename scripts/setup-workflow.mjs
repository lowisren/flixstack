#!/usr/bin/env node
// ============================================================
// Flixstack — Tier 2 editorial process (workflow, roles, publish rules)
//
// Implements docs/cms-editor-experience-tier2.md via the Management API:
//   [roles]     create custom "Content Editor" (dev-publish only) and
//               "Reviewer" (dev + prod publish) roles, cloning the built-in
//               Content Manager rule shape and narrowing the environment module
//   [workflow]  create/update the "Editorial Review" workflow (5 stages) with
//               per-stage role permissions (SYS_ACL)
//   [rules]     create a publish rule that gates PRODUCTION publishing to the
//               "Ready to Publish" stage, approved by Reviewer / Admin
//
// Roles are resolved by NAME at run time, so phases are order-independent and
// re-runnable. Everything is idempotent (update-in-place when it already exists).
//
// Usage (alias: `pnpm setup-workflow <phase> [--dry]`):
//   node scripts/setup-workflow.mjs [roles|workflow|rules|all] [--dry]
//     --dry : read + build payloads, print them, make NO writes
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// The management token must have admin scope to manage roles/workflows.
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
const LOCALE = "en-us";
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
const dump = (label, obj) => console.log(`  [dry] ${label}:\n${JSON.stringify(obj, null, 2).split("\n").map((l) => "    " + l).join("\n")}`);

// ---- lookups ------------------------------------------------
async function listRoles() { return (await cma("GET", "/roles?include_rules=true")).roles || []; }
async function listEnvironments() { return (await cma("GET", "/environments")).environments || []; }
async function listWorkflows() { return (await cma("GET", "/workflows")).workflows || []; }

const byName = (arr, name) => arr.find((x) => x.name === name);

// The 8 content types that move through editorial review.
const WORKFLOW_CTS = ["movie", "tv_series", "episode", "page", "hero_banner", "homepage_rail", "genre", "person"];

// ============================================================
// Phase: custom roles
// ============================================================
// Clone the built-in Content Manager rule set, then adapt it for role CREATION.
// The GET representation and the POST schema differ: POST requires an explicit
// `acl` on the branch/branch_alias/locale/environment modules, and rejects the
// `$all` shorthand for branches/branch_aliases (real names only). We also swap
// the `environment` list so publishing is scoped per role — editors get
// development only; reviewers get development + production.
function roleRulesFrom(cmRules, envUids) {
  return cmRules.map((r) => {
    const rule = { ...r };
    if (rule.module === "branch") { rule.branches = [BRANCH]; rule.acl = rule.acl || { read: true }; }
    if (rule.module === "branch_alias") { rule.branch_aliases = []; rule.acl = rule.acl || { read: true }; }
    if (rule.module === "locale") { rule.acl = rule.acl || { read: true }; }
    if (rule.module === "environment") { rule.environments = envUids; rule.acl = rule.acl || { read: true }; }
    return rule;
  });
}

async function runRoles() {
  console.log("\n== Phase: custom roles ==");
  const roles = await listRoles();
  const cm = byName(roles, "Content Manager");
  if (!cm) { console.log("  ! built-in 'Content Manager' role not found — cannot derive rules"); return; }
  const cmFull = await cma("GET", `/roles/${cm.uid}?include_rules=true`);
  const cmRules = cmFull.role.rules;

  const envs = await listEnvironments();
  const dev = byName(envs, "development")?.uid;
  const prod = byName(envs, "production")?.uid;
  if (!dev) { console.log("  ! 'development' environment not found"); return; }

  const defs = [
    {
      name: "Content Editor",
      description: "Create and edit entries and assets, submit for review, publish to development only. Cannot edit content types, manage settings, or publish to production.",
      environments: [dev],
    },
    {
      name: "Reviewer",
      description: "All Content Editor abilities plus approving entries and publishing to production. Cannot edit content types or manage stack settings.",
      environments: prod ? [dev, prod] : [dev],
    },
  ];

  for (const def of defs) {
    const body = { role: { name: def.name, description: def.description, rules: roleRulesFrom(cmRules, def.environments) } };
    const existing = byName(roles, def.name);
    if (DRY) { dump(`${existing ? "UPDATE" : "CREATE"} role ${def.name} (env: ${def.environments.join(", ")})`, body); continue; }
    try {
      if (existing) { await cma("PUT", `/roles/${existing.uid}`, body); console.log(`  ↻ ${def.name}: updated`); }
      else { const r = await cma("POST", "/roles", body); console.log(`  + ${def.name}: created (${r.role?.uid})`); }
    } catch (e) { console.log(`  ! ${def.name}: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
  }
}

// ============================================================
// Phase: workflow
// ============================================================
const STAGE_COLORS = { draft: "#909090", review: "#e0a22b", changes: "#c4553b", ready: "#3d72b8", published: "#4e8a57" };

// SYS_ACL: `allUsers` = anyone may act at this stage; otherwise restrict to `roleUids`.
function stage(name, color, { allUsers = false, roleUids = [] } = {}) {
  return {
    name, color,
    SYS_ACL: {
      roles: { uids: roleUids },
      users: { uids: [], _default: allUsers },
      others: { _default: false },
    },
    next_available_stages: ["$all"], // linear restriction is a UI/second-pass refinement (needs stage UIDs)
    allStages: true,
    allUsers,
    specificStagesUsers: {},
    specificUsers: {},
    entry_lock: "$none",
  };
}

async function runWorkflow() {
  console.log("\n== Phase: Editorial Review workflow ==");
  const roles = await listRoles();
  const uid = (n) => byName(roles, n)?.uid;
  const editor = uid("Content Editor"), reviewer = uid("Reviewer");
  const developer = uid("Developer"), admin = uid("Admin");
  if (!editor || !reviewer) console.log("  ⚠  custom roles not found yet — run the `roles` phase first for full permissions.");

  const approvers = [reviewer, developer, admin].filter(Boolean);
  const contributors = [editor, reviewer, developer, admin].filter(Boolean);

  const stages = [
    // Draft is open to everyone, but the API requires a non-empty stage ACL, so we
    // enumerate all roles rather than rely on a users._default flag.
    stage("Draft", STAGE_COLORS.draft, { roleUids: contributors }),
    stage("In Review", STAGE_COLORS.review, { roleUids: contributors }),
    stage("Changes Requested", STAGE_COLORS.changes, { roleUids: approvers }),
    stage("Ready to Publish", STAGE_COLORS.ready, { roleUids: approvers }),
    stage("Published", STAGE_COLORS.published, { roleUids: approvers }),
  ];
  const body = { workflow: { name: "Editorial Review", enabled: true, branches: [BRANCH], content_types: WORKFLOW_CTS, workflow_stages: stages, admin_users: {} } };

  const existing = byName(await listWorkflows(), "Editorial Review");
  if (DRY) { dump(`${existing ? "UPDATE" : "CREATE"} workflow Editorial Review`, body); return; }
  try {
    if (existing) { await cma("PUT", `/workflows/${existing.uid}`, body); console.log(`  ↻ Editorial Review: updated (${existing.uid})`); }
    else { const r = await cma("POST", "/workflows", body); console.log(`  + Editorial Review: created (${r.workflow?.uid})`); }
  } catch (e) { console.log(`  ! workflow: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
}

// ============================================================
// Phase: publish rule (gate production)
// ============================================================
async function runRules() {
  console.log("\n== Phase: production publish rule ==");
  const wf = byName(await listWorkflows(), "Editorial Review");
  if (!wf) { console.log("  ! 'Editorial Review' workflow not found — run the `workflow` phase first."); return; }
  const full = await cma("GET", `/workflows/${wf.uid}`);
  const ready = (full.workflow.workflow_stages || []).find((s) => s.name === "Ready to Publish");
  if (!ready) { console.log("  ! 'Ready to Publish' stage not found on the workflow."); return; }

  const envs = await listEnvironments();
  const prod = byName(envs, "production")?.uid;
  if (!prod) { console.log("  ! 'production' environment not found — nothing to gate."); return; }

  const roles = await listRoles();
  const approverRoles = [byName(roles, "Reviewer")?.uid, byName(roles, "Admin")?.uid].filter(Boolean);

  const body = {
    publishing_rule: {
      workflow: wf.uid,
      actions: ["publish"], // a rule targets a single action; gate production publishing
      branches: [BRANCH],
      content_types: WORKFLOW_CTS, // must be within the workflow's content-type set (not $all)
      locales: [LOCALE],
      environment: prod,
      approvers: { users: [], roles: approverRoles },
      workflow_stage: ready.uid,
      disable_approver_publishing: false,
    },
  };

  const existingRules = (await cma("GET", "/workflows/publishing_rules")).publishing_rules || [];
  const dupe = existingRules.find((r) => r.workflow === wf.uid && r.environment === prod && r.workflow_stage === ready.uid);
  if (DRY) { dump(`${dupe ? "UPDATE" : "CREATE"} production publish rule`, body); return; }
  try {
    if (dupe) { await cma("PUT", `/workflows/publishing_rules/${dupe.uid}`, body); console.log(`  ↻ publish rule: updated (${dupe.uid})`); }
    else { const r = await cma("POST", "/workflows/publishing_rules", body); console.log(`  + publish rule: created (${r.publishing_rule?.uid})`); }
  } catch (e) { console.log(`  ! publish rule: ${e.status || e.message}`); if (e.body) console.log("    ", JSON.stringify(e.body)); }
}

// ---- main --------------------------------------------------
const phase = (process.argv.slice(2).find((a) => !a.startsWith("-")) || "all").toLowerCase();
const run = {
  roles: runRoles,
  workflow: runWorkflow,
  rules: runRules,
  all: async () => { await runRoles(); await runWorkflow(); await runRules(); },
};

console.log(`\n🎬 Flixstack editorial process  (branch: ${BRANCH}, region: ${REGION}, phase: ${phase}${DRY ? ", DRY-RUN — no writes" : ""})`);
console.log("   NOTE: inviting users and assigning them to these roles is an org/UI task — see docs/cms-editor-experience-tier2.md");
(run[phase] || (() => { console.error("unknown phase:", phase, "\nexpected: roles | workflow | rules | all"); process.exit(1); }))()
  .then(() => console.log(`\n✓ Done: ${phase}\n`))
  .catch((e) => { console.error("\n✗ FAILED:", e.message); process.exit(1); });
