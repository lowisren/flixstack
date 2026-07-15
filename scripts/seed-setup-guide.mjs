#!/usr/bin/env node
// ============================================================
// Flixstack — setup_guide content type + entry
//
// Creates (or updates) the `setup_guide` singleton content type and its one
// entry, then publishes it. This is the CMS source for the /setup Developer
// Guide page, which previously hard-coded its content.
//
// The prose fields (intro, step/feature descriptions) are JSON ("Advanced")
// Rich Text — the same rich_text_type the stack already uses for `synopsis`,
// so normalize.ts renders them with @contentstack/utils' jsonToHTML.
//
// Idempotent & re-runnable. Usage: node scripts/seed-setup-guide.mjs
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
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
const LOCALE = "en-us";
const CT_UID = "setup_guide";

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN in .env.local");
  process.exit(1);
}

// US/NA → api.contentstack.io. Other regions use the documented CMA hosts.
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
    throw err;
  }
  return json;
}

// ---- JSON RTE ("Advanced") document helpers ----------------
const uid = () => randomUUID().replace(/-/g, "").slice(0, 16);
/** Builds a JSON RTE document from one or more plain-text paragraphs. A JSON RTE
 * doc must contain at least one structured child, so an empty call still emits a
 * single empty paragraph (rendered as an empty string and treated as absent). */
function rte(...paragraphs) {
  const paras = paragraphs.length ? paragraphs : [""];
  return {
    type: "doc",
    uid: uid(),
    attrs: {},
    children: paras.map((text) => ({
      type: "p",
      uid: uid(),
      attrs: {},
      children: [{ text }],
    })),
  };
}

// ---- Content type schema -----------------------------------
// True JSON RTE ("Supercharged") field: data_type "json" + allow_json_rte.
// (`allow_rich_text`/`rich_text_type` alone is the HTML-based RTE, which stores a
// string — see content-models/MIGRATION_STATUS.md note 6.)
const advancedRte = (display_name, extra = {}) => ({
  display_name,
  data_type: "json",
  field_metadata: { allow_json_rte: true, rich_text_type: "advanced", embed_objects: [], options: [], multiline: false, ref_multiple_content_types: true },
  reference_to: ["sys_assets"],
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
  ...extra,
});
const linkField = (uid, display_name) => ({
  uid,
  display_name,
  data_type: "global_field",
  reference_to: "link",
  multiple: false,
  mandatory: false,
  unique: false,
  non_localizable: false,
});

const contentType = {
  title: "Setup Guide",
  uid: CT_UID,
  description: "Singleton entry that drives the /setup Developer Guide page: intro, setup steps, feature deep-dives, and documentation links.",
  options: { is_page: false, singleton: true, title: "title" },
  schema: [
    { display_name: "Title", uid: "title", data_type: "text", mandatory: true, unique: false, multiple: false, non_localizable: false },
    { display_name: "Badge Label", uid: "badge_label", data_type: "text", mandatory: false, unique: false, multiple: false, non_localizable: false },
    advancedRte("Intro", { uid: "intro" }),
    { display_name: "Steps Heading", uid: "steps_heading", data_type: "text", mandatory: false, unique: false, multiple: false, non_localizable: false },
    {
      display_name: "Steps", uid: "steps", data_type: "group", multiple: true,
      mandatory: false, unique: false, non_localizable: false,
      schema: [
        { display_name: "Heading", uid: "heading", data_type: "text", mandatory: true, unique: false, multiple: false, non_localizable: false },
        advancedRte("Description", { uid: "description" }),
        advancedRte("Detail", { uid: "detail" }),
        { display_name: "Code", uid: "code", data_type: "text", field_metadata: { description: "", multiline: true, version: 3 }, mandatory: false, unique: false, multiple: false, non_localizable: false },
        linkField("docs_link", "Docs Link"),
      ],
    },
    { display_name: "Features Heading", uid: "features_heading", data_type: "text", mandatory: false, unique: false, multiple: false, non_localizable: false },
    advancedRte("Features Intro", { uid: "features_intro" }),
    {
      display_name: "Features", uid: "features", data_type: "group", multiple: true,
      mandatory: false, unique: false, non_localizable: false,
      schema: [
        { display_name: "Anchor ID", uid: "anchor_id", data_type: "text", mandatory: true, unique: false, multiple: false, non_localizable: false },
        {
          display_name: "Icon", uid: "icon", data_type: "text", display_type: "dropdown",
          enum: { advanced: true, choices: ["database", "layers", "zap", "tags", "users", "bot"].map((v) => ({ key: v, value: v })) },
          field_metadata: { default_value: "" },
          mandatory: false, unique: false, multiple: false, non_localizable: false,
        },
        { display_name: "Heading", uid: "heading", data_type: "text", mandatory: true, unique: false, multiple: false, non_localizable: false },
        advancedRte("Description", { uid: "description" }),
        { display_name: "Field Tags", uid: "field_tags", data_type: "text", mandatory: false, unique: false, multiple: true, non_localizable: false },
        linkField("learn_link", "Learn Link"),
      ],
    },
    { display_name: "Docs Heading", uid: "docs_heading", data_type: "text", mandatory: false, unique: false, multiple: false, non_localizable: false },
    {
      display_name: "Doc Links", uid: "doc_links", data_type: "group", multiple: true,
      mandatory: false, unique: false, non_localizable: false,
      schema: [
        linkField("link", "Link"),
        { display_name: "Description", uid: "description", data_type: "text", mandatory: false, unique: false, multiple: false, non_localizable: false },
      ],
    },
  ],
};

// ---- Entry data (migrated verbatim from src/app/setup/page.tsx) ----
const ENV_CODE = `# .env.local
NEXT_PUBLIC_CONTENTSTACK_API_KEY=your_api_key
NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT=development
NEXT_PUBLIC_CONTENTSTACK_REGION=US  # or EU, AZURE_NA, AZURE_EU, GCP_NA, GCP_EU
NEXT_PUBLIC_CONTENTSTACK_BRANCH=main  # content branch to read from (default: main)

# Required for Live Preview / Visual Builder — server-only, no NEXT_PUBLIC_ prefix
CONTENTSTACK_PREVIEW_TOKEN=your_preview_token

# Required for the seed / migration scripts — server-only
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token

# Optional: Lytics integration
NEXT_PUBLIC_CONTENTSTACK_LYTICS_ACCOUNT_ID=your_lytics_id
NEXT_PUBLIC_CONTENTSTACK_LYTICS_API_KEY=your_lytics_server_key`;

const SEED_CODE = `# Install Management SDK dependencies first
pnpm install

# 1. Create the content_tags taxonomy terms (governed tag vocabulary)
node scripts/migrate-v2.mjs terms

# 2. Seed the entries
pnpm seed

# This creates:
# - 6 genres, movies, TV series, cast/crew (person) entries
# - Hero banners + homepage rails
# - Navigation, header, footer, and site config`;

const RUN_CODE = `pnpm dev
# → http://localhost:3000

# Open any entry in Contentstack and launch Visual Builder
# to see and edit it live against this running app`;

const link = (label, href) => ({ label, href, open_in_new_tab: true });

const entry = {
  title: "Flixstack Setup Guide",
  badge_label: "Developer Guide",
  intro: rte(
    "Get Flixstack connected to Contentstack in under 10 minutes. This guide walks you through every step and explains what each Contentstack feature does in the context of the site."
  ),
  steps_heading: "Setup Steps",
  steps: [
    {
      heading: "Create a Contentstack Stack",
      description: rte("A stack is your project workspace in Contentstack. Think of it as your database + API in one."),
      detail: rte("Sign in to Contentstack → Click 'New Stack' → Name it 'Flixstack' → Choose your region."),
      code: "",
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/developers/create-stack"),
    },
    {
      heading: "Import the Content Models",
      description: rte("Import the pre-built schema — 13 content types and 6 global fields — from content-models/export.json into your stack. The content_tags taxonomy is created separately in the next step."),
      detail: rte("In your stack → Settings → Import/Export → Import stack → Upload content-models/export.json"),
      code: "",
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/developers/apis/content-management-api"),
    },
    {
      heading: "Configure Environment Variables",
      description: rte("Copy your API credentials from Contentstack and add them to .env.local."),
      detail: rte(),
      code: ENV_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/developers/apis/content-delivery-api"),
    },
    {
      heading: "Seed the Taxonomy & Sample Content",
      description: rte("Create the content_tags taxonomy terms, then populate your stack with movies, shows, genres, and people. Entries reference taxonomy terms, so the terms must exist first."),
      detail: rte(),
      code: SEED_CODE,
      docs_link: null,
    },
    {
      heading: "Connect Lytics (Optional)",
      description: rte("Enable audience segmentation and personalized content by connecting your Lytics workspace."),
      detail: rte("Create a Lytics account → Get your Account ID → Add NEXT_PUBLIC_LYTICS_ACCOUNT_ID to .env.local. The site will automatically track title views, search queries, and playback events."),
      code: "",
      docs_link: link("View Documentation", "https://docs.lytics.com"),
    },
    {
      heading: "Run the App",
      description: rte("Start the development server and explore the site with Contentstack Inspector enabled."),
      detail: rte(),
      code: RUN_CODE,
      docs_link: null,
    },
  ],
  features_heading: "Contentstack Features in Flixstack",
  features_intro: rte(
    "Every feature on the site maps to a specific Contentstack capability. Open any entry in Contentstack and launch Visual Builder to see and edit the content model behind any component, live."
  ),
  features: [
    {
      anchor_id: "content-models",
      icon: "database",
      heading: "Content Models",
      description: rte("13 structured content types define every piece of content on the site — from a single movie to a full homepage rail. Movies and TV series share their common fields (rating, artwork, availability, tags) through reusable global fields and a taxonomy, so the model stays DRY. Field types in use: Short Text, Rich Text, File, Reference, Select, Boolean, Group, Global Field, and Taxonomy."),
      field_tags: ["movie", "tv_series", "episode", "person", "genre", "hero_banner", "homepage_rail", "page", "navigation", "site_config", "header", "footer", "setup_guide"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/create-a-content-type"),
    },
    {
      anchor_id: "modular-blocks",
      icon: "layers",
      heading: "Modular Blocks",
      description: rte("Homepage rails, hero banners, and promo sections are modular blocks — composable page sections that editors can arrange freely without engineering changes. Open Dev Mode and click any rail to see its block type."),
      field_tags: ["hero_block", "rail_block", "promo_block", "genre_spotlight_block"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/create-a-content-type/understand-modular-blocks"),
    },
    {
      anchor_id: "global-fields",
      icon: "zap",
      heading: "Global Fields",
      description: rte("Six reusable field groups keep the model DRY. title_metadata (rating, tier, release date, score) and artwork (hero image, thumbnail) are shared by movies and TV series; cta and link standardize buttons and navigation links across the site; seo and availability_window round out the set. Edit a global field once and every content type using it updates."),
      field_tags: ["title_metadata", "artwork", "cta", "link", "seo", "availability_window"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/create-a-content-type/understanding-global-fields"),
    },
    {
      anchor_id: "taxonomy",
      icon: "tags",
      heading: "Taxonomy",
      description: rte("Content tags are a governed taxonomy, not free text. Editors pick from a shared vocabulary of terms attached to movies and TV series, so tagging stays consistent, filterable, and reusable across the whole catalog."),
      field_tags: ["content_tags", "governed terms"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/taxonomy"),
    },
    {
      anchor_id: "header-footer-nav",
      icon: "layers",
      heading: "Header, Footer & Navigation",
      description: rte("The main nav and footer nav are separate, reusable navigation entries whose links use the shared link global field — reference one navigation entry from the header content type, or from any footer column. Both are fully editable in Live Preview / Visual Builder."),
      field_tags: ["navigation", "header", "footer", "link"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/references/add-a-reference-field"),
    },
    {
      anchor_id: "personalization",
      icon: "users",
      heading: "Personalization with Lytics",
      description: rte("The hero banner and featured rail adapt to five Lytics audience segments. The site tracks viewing behavior and Lytics resolves which segment a visitor belongs to — Contentstack then serves the matching content variant."),
      field_tags: ["action_fan", "binge_watcher", "new_user", "premium_subscriber", "lapsed_user"],
      learn_link: link("Learn More", "https://docs.lytics.com"),
    },
    {
      anchor_id: "automations",
      icon: "bot",
      heading: "Agent OS & Automations",
      description: rte("Three Automation Hub workflows show how to automate content operations: auto-tagging new titles with AI, expiring content on a schedule, and triggering notifications when new episodes publish."),
      field_tags: ["Auto-tagging pipeline", "Availability expiry", "New episode notifications"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/developers/automation-hub"),
    },
  ],
  docs_heading: "Explore the Docs",
  doc_links: [
    { link: link("Content Delivery API", "https://www.contentstack.com/docs/developers/apis/content-delivery-api"), description: "Fetch entries, assets, and queries" },
    { link: link("Content Management API", "https://www.contentstack.com/docs/developers/apis/content-management-api"), description: "Create, update, publish content" },
    { link: link("Automation Hub", "https://www.contentstack.com/docs/developers/automation-hub"), description: "Build no-code content workflows" },
    { link: link("Personalize with Lytics", "https://www.contentstack.com/docs/developers/personalization"), description: "Audience segmentation & variants" },
  ],
};

// ---- Run ---------------------------------------------------
async function upsertContentType() {
  try {
    await cma("GET", `/content_types/${CT_UID}`);
    console.log(`  ↻ Updating content type '${CT_UID}'…`);
    await cma("PUT", `/content_types/${CT_UID}`, { content_type: contentType });
  } catch (err) {
    if (err.status !== 404 && err.status !== 422) throw err;
    console.log(`  + Creating content type '${CT_UID}'…`);
    await cma("POST", `/content_types`, { content_type: contentType });
  }
}

async function upsertEntry() {
  const existing = await cma("GET", `/content_types/${CT_UID}/entries?only[BASE][]=uid&limit=1`);
  const found = existing.entries?.[0]?.uid;
  if (found) {
    console.log(`  ↻ Updating entry ${found}…`);
    await cma("PUT", `/content_types/${CT_UID}/entries/${found}`, { entry });
    return found;
  }
  console.log(`  + Creating entry…`);
  const res = await cma("POST", `/content_types/${CT_UID}/entries`, { entry });
  return res.entry.uid;
}

async function publish(entryUid) {
  const { environments = [] } = await cma("GET", `/environments`);
  const names = environments.map((e) => e.name);
  if (!names.length) { console.log("  (no environments to publish to)"); return; }
  console.log(`  ⇪ Publishing to: ${names.join(", ")}`);
  await cma("POST", `/content_types/${CT_UID}/entries/${entryUid}/publish`, {
    entry: { environments: names, locales: [LOCALE] },
  });
}

async function main() {
  console.log(`\n🛠  setup_guide provisioning  (branch: ${BRANCH}, region: ${REGION})\n`);
  await upsertContentType();
  const entryUid = await upsertEntry();
  await publish(entryUid);
  console.log(`\n✓ Done. setup_guide entry ${entryUid} is live.\n`);
}

main().catch((err) => { console.error("\n✗ Failed:", err.message); process.exit(1); });
