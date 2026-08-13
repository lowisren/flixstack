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
// Idempotent & re-runnable.
//
// Usage: node scripts/seed-setup-guide.mjs [--dry] [--env=<name>[,<name>]]
//   --dry   : print the planned content-type/entry payloads, make NO writes
//   --env=  : publish only to these environments (comma-separated). Defaults to
//             NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT; pass --env=all for every
//             environment in the stack. This used to always publish to *all*
//             environments, which quietly pushed editorial changes to production.
//
// Requires .env.local: CONTENTSTACK_MANAGEMENT_TOKEN, NEXT_PUBLIC_CONTENTSTACK_API_KEY
// Override the env file with ENV_FILE=.env.other (repo-root-relative or absolute).
// ============================================================

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

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
const LOCALE = "en-us";
const CT_UID = "setup_guide";
const ENTRY_URL = "/setup";

const DRY = process.argv.includes("--dry");
// Publish target: --env=a,b | --env=all | default = the configured environment.
// Defaulting to one environment (rather than all) keeps a routine copy fix off
// production; --env=all restores the old behaviour explicitly.
const ENV_ARG = process.argv.find((a) => a.startsWith("--env="))?.slice(6);
const ENV_TARGET = ENV_ARG ?? process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT ?? "all";

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
  description: "Singleton, page-type: drives the fixed /setup Developer Guide route (intro, setup steps, feature deep-dives, doc links). `is_page` + the `url` field are what let Contentstack link this entry to its live page and open it in Visual Editor.",
  // is_page + a url field are required for Visual Editor to open this entry — see
  // docs/cms-editor-experience-tier3.md §3.1a. Deliberately NO url_pattern/url_prefix:
  // a singleton silently drops both (HTTP 200, not persisted), so the entry's own
  // `url` value is authoritative. Keep this in sync with scripts/fix-url-patterns.mjs;
  // reverting either one is what previously broke Visual Editor for this entry.
  options: { is_page: true, singleton: true, title: "title" },
  schema: [
    { display_name: "Title", uid: "title", data_type: "text", mandatory: true, unique: false, multiple: false, non_localizable: false },
    {
      display_name: "URL", uid: "url", data_type: "text", mandatory: false,
      field_metadata: {
        _default: true, version: 3,
        instruction: `Fixed page path for this singleton — always ${ENTRY_URL}, matching the route in src/app/setup/page.tsx. This is what links the entry to its live page and lets Visual Editor open it. Do not edit.`,
      },
      multiple: false, unique: false, non_localizable: true,
    },
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

// ---- Entry data -------------------------------------------------
// Mirrored in src/lib/setup-fallback.ts (as pre-rendered HTML) — change both.
// Every command here must be runnable as written against a fresh stack; the
// counts (8 global fields, 13 content types, 77 terms, 77 entries, 85 assets)
// are asserted against content-models/export.json and the scripts they describe.
const ENV_CODE = `# .env.local
NEXT_PUBLIC_CONTENTSTACK_API_KEY=your_api_key
NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT=development
NEXT_PUBLIC_CONTENTSTACK_REGION=US  # or EU, AU, AZURE_NA, AZURE_EU, GCP_NA, GCP_EU
NEXT_PUBLIC_CONTENTSTACK_BRANCH=main  # content branch to read from (default: main)

# Live Preview / Visual Editor — master switch. Without this the edit tags and
# the editor bridge are never rendered, even with a valid preview token.
NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW=true

# Preview token — server-only, no NEXT_PUBLIC_ prefix
CONTENTSTACK_PREVIEW_TOKEN=your_preview_token

# Required for the seed / import / asset scripts — server-only
CONTENTSTACK_MANAGEMENT_TOKEN=your_management_token

# Optional: Lytics integration
NEXT_PUBLIC_CONTENTSTACK_LYTICS_ACCOUNT_ID=your_lytics_id
NEXT_PUBLIC_CONTENTSTACK_LYTICS_API_KEY=your_lytics_server_key`;

const MODEL_CODE = `npm install

# 1. Create the content_tags taxonomy + its 77 governed terms.
#    movie and tv_series each carry a taxonomy field bound to it, so it
#    has to exist before those content types can be created.
node scripts/migrate-v2.mjs terms

# 2. Create 8 global fields + 13 content types from content-models/export.json
npm run import-model

# Both are idempotent — re-running skips whatever already exists.
# Add --dry to either one to see the planned writes without making them.`;

const SEED_CODE = `# Seed the entries (drafts — nothing is published yet)
npm run seed

# This creates 77 entries:
# - 6 genres, 15 people, 20 movies, 3 TV series, 18 episodes
# - 3 hero banners, 5 homepage rails
# - 4 navigation entries, header, footer, and site config`;

const ASSETS_CODE = `npm run upload-assets

# Uploads 85 images from assets-backup/ and writes 88 field placements,
# including nested global-field paths like artwork.hero_image.
# Idempotent: assets are matched by title, and a field that already points
# at the right asset is left alone. Use --force to overwrite, --dry to preview.`;

const PUBLISH_CODE = `# 1. Publish the seeded entries + their now-linked artwork
npx tsx scripts/seed.ts --publish --update

# 2. Publish this guide's own entry (creates it if absent)
node scripts/seed-setup-guide.mjs

# Publishes to NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT. You can also publish
# from the Contentstack UI: select entries → Publish → pick an environment.`;

const RUN_CODE = `npm run dev
# → http://localhost:3000

# Then, in Contentstack: Settings → Environments → edit your environment and
# set its Base URL to http://localhost:3000 so the editor can load the app.
# Open any entry and launch Visual Editor to edit it live against this server.`;

const EDITOR_CODE = `# Field-level help text, placeholders and sensible defaults
npm run customize-fields

# Validation rules that keep editors inside the model (regex, required fields)
npm run content-governance

# Optional: an "Editorial Review" workflow + a rule gating production publishing
npm run setup-workflow

# All three are idempotent and accept --dry.`;

const LYTICS_CODE = `# .env.local — both optional
NEXT_PUBLIC_CONTENTSTACK_LYTICS_ACCOUNT_ID=your_lytics_id
NEXT_PUBLIC_CONTENTSTACK_LYTICS_API_KEY=your_lytics_server_key`;

const link = (label, href) => ({ label, href, open_in_new_tab: true });

const entry = {
  title: "Flixstack Setup Guide",
  url: ENTRY_URL,
  badge_label: "Developer Guide",
  intro: rte(
    "Get Flixstack running against your own Contentstack stack in about 20 minutes. Steps 1 to 8 take you from an empty stack to a fully populated, published site; steps 9 and 10 are optional extras. Each step also explains what the Contentstack feature behind it actually does."
  ),
  steps_heading: "Setup Steps",
  steps: [
    {
      heading: "Create a Contentstack Stack",
      description: rte("A stack is your project workspace in Contentstack — your content model, content, and delivery APIs in one place."),
      detail: rte("Sign in to Contentstack → click 'New Stack' → name it 'Flixstack' → choose your region. Note which region you pick: it has to match NEXT_PUBLIC_CONTENTSTACK_REGION in step 3, because every region has its own API host."),
      code: "",
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/create-a-new-stack"),
    },
    {
      heading: "Create Your Tokens",
      description: rte("Flixstack needs three credentials, created in two places in your stack. Grab them all now — later steps fail without them."),
      detail: rte(
        "Settings → Tokens → Delivery Tokens → 'Create New Token': pick an environment (start with 'development') and turn on the 'Create Preview Token' toggle on the same screen. That gives you both the delivery token (reads published content) and the preview token (reads drafts for Live Preview).",
        "Settings → Tokens → Management Tokens → 'Create New Token': this one writes, and is what the import, seed, and asset scripts in the next steps authenticate with. Also note your environment names — you need one in step 3."
      ),
      code: "",
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/create-a-delivery-token"),
    },
    {
      heading: "Configure Environment Variables",
      description: rte("Copy the example env file and fill in the credentials from step 2. Do this before importing the content model — the import runs against the Management API and reads these values."),
      detail: rte("Run cp .env.local.example .env.local, then fill in the blanks. The API key is in Settings → API Credentials. Note that NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW is the master switch for Live Preview and Visual Editor: leave it out and the editor stays dark even with a valid preview token. Values are inlined at build time, so a deployed environment needs them set before its build."),
      code: ENV_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/developers/apis/content-delivery-api"),
    },
    {
      heading: "Create the Content Model",
      description: rte("Install dependencies, then build the pre-made schema — 8 global fields and 13 content types — in your stack from content-models/export.json. Run the taxonomy step first: movie and tv_series both bind a taxonomy field to content_tags, so it has to exist before they can be created."),
      detail: rte("export.json is a plain schema document, not a Contentstack CLI export bundle, so the stack UI importer won't accept it — it's applied through the Content Management API instead. Content types are created in rounds, and any that reference something not yet created are retried on the next round, so ordering resolves itself."),
      code: MODEL_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/developers/apis/content-management-api"),
    },
    {
      heading: "Seed the Sample Content",
      description: rte("Populate your stack with movies, shows, episodes, genres, and people, seeded from src/lib/mock-data.ts. Everything is created as a draft — nothing is published yet, and the site will still look empty after this step. That's expected: steps 6 and 7 finish the job."),
      detail: rte(),
      code: SEED_CODE,
      docs_link: null,
    },
    {
      heading: "Upload the Artwork",
      description: rte("Upload the poster, thumbnail, and hero images and link them to the entries you just seeded. Skip this and every title card, hero, and episode renders without an image — the entries exist, but their image fields are empty."),
      detail: rte("Driven by assets-backup/manifest.json, which names the entry to match and the field path to set for each placement. Three images are intentionally reused across hero banners, which is why there are more placements than files."),
      code: ASSETS_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/publish-an-entry"),
    },
    {
      heading: "Publish Everything",
      description: rte("This is the step that makes the site render. The Content Delivery API only serves published content, so until you publish, your stack is full of entries the app cannot see. Publish after uploading artwork, so the entries go out with their images already attached."),
      detail: rte("Publishing is per environment: an entry published to 'development' is invisible to a delivery token scoped to 'production'. If your stack has a workflow or publish rule on an environment, entries have to reach the required stage before they can go out to it."),
      code: PUBLISH_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/publish-an-entry"),
    },
    {
      heading: "Run the App",
      description: rte("Start the dev server. You should now see a fully populated homepage, with artwork, served live from your stack."),
      detail: rte("To edit content in place, Contentstack needs to know where your app lives: set your environment's Base URL, then open any entry and launch Visual Editor. Every editable field on the page carries a data-cslp tag, and edits reflect live without a refresh. Live Preview works on any environment where NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW is true — leave it off in production so the markup renders clean."),
      code: RUN_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/set-up-visual-editor-for-your-website"),
    },
    {
      heading: "Polish the Editor Experience (Optional)",
      description: rte("A working model is not the same as a pleasant one to edit. These three scripts apply the field-level guidance, validation, and publishing workflow that make the stack feel finished to a content editor."),
      detail: rte("Worth running even on a throwaway stack: they are the most concrete example in this project of the difference between a schema that validates and a schema an editor can actually work in."),
      code: EDITOR_CODE,
      docs_link: link("View Documentation", "https://www.contentstack.com/docs/headless-cms/create-a-content-type"),
    },
    {
      heading: "Connect Lytics (Optional)",
      description: rte("Add a Lytics account to turn on behavioural tracking. The site sends page views, title views, search queries, and playback events, and resolves which audience segments a visitor belongs to."),
      detail: rte("Add your Lytics account ID and server key to .env.local. Segment membership is resolved server-side and exposed through the /api/lytics/segment route; /profile shows the segments resolved for the current visitor. Using those segments to swap the hero or reorder rails is the extension point, not something this starter ships — see the Personalization section below."),
      code: LYTICS_CODE,
      docs_link: link("View Documentation", "https://docs.lytics.com"),
    },
  ],
  features_heading: "Contentstack Features in Flixstack",
  features_intro: rte(
    "Every feature on the site maps to a specific Contentstack capability. Open any entry in Contentstack and launch Visual Editor to see and edit the content model behind any component, live."
  ),
  // anchor_id values are deep-linked from src/app/page.tsx, components/layout/footer.tsx
  // and app/profile/profile-client.tsx — renaming one silently breaks those links.
  // icon values must stay inside ICON_MAP in src/app/setup/page.tsx (and the enum above).
  features: [
    {
      anchor_id: "content-models",
      icon: "database",
      heading: "Content Models",
      description: rte("13 structured content types define every piece of content on the site — from a single movie to a full homepage rail. Movies and TV series share their common fields (rating, artwork, availability, tags) through reusable global fields and a taxonomy, so the model stays DRY. Field types in use: Short Text, JSON Rich Text, File, Reference, Select, Boolean, Group, Modular Blocks, Global Field, and Taxonomy."),
      field_tags: ["movie", "tv_series", "episode", "person", "genre", "hero_banner", "homepage_rail", "page", "navigation", "site_config", "header", "footer", "setup_guide"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/headless-cms/create-a-content-type"),
    },
    {
      anchor_id: "modular-blocks",
      icon: "layers",
      heading: "Modular Blocks",
      description: rte("Two fields in the model are modular blocks. The page content type's sections field lets an editor compose a route out of hero, rail, promo, and genre-spotlight blocks in any order, without an engineering change — that's how the home and browse pages are assembled. tv_series.seasons uses one too, nesting each season's episodes inside the series entry. Homepage rails and hero banners are separate content types that the rail and hero blocks reference."),
      field_tags: ["page.sections", "hero_block", "rail_block", "promo_block", "genre_spotlight_block", "tv_series.seasons", "season_block"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/headless-cms/modular-blocks"),
    },
    {
      anchor_id: "global-fields",
      icon: "zap",
      heading: "Global Fields",
      description: rte("Eight reusable field groups keep the model DRY. title_metadata (rating, tier, release date, score) and artwork (hero image, thumbnail) are shared by movies and TV series; playback carries the video source and captions; cta standardizes buttons; link and nav_link standardize the two kinds of link on the site; seo and availability_window round out the set. Edit a global field once and every content type using it picks up the change."),
      field_tags: ["title_metadata", "artwork", "playback", "cta", "link", "nav_link", "seo", "availability_window"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/headless-cms/about-global-field"),
    },
    {
      anchor_id: "taxonomy",
      icon: "tags",
      heading: "Taxonomy",
      description: rte("Content tags are a governed taxonomy, not free text. Editors pick from a shared vocabulary of 77 terms attached to movies and TV series, so tagging stays consistent, filterable, and reusable across the whole catalog — and a typo can't quietly create a new tag."),
      field_tags: ["content_tags", "77 governed terms"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/headless-cms/about-taxonomy"),
    },
    {
      anchor_id: "header-footer-nav",
      icon: "layers",
      heading: "Header, Footer & Navigation",
      description: rte("The main nav and the footer navs are separate, reusable navigation entries, referenced from the header content type and from each footer column. Their links use the nav_link global field, where a label and href are mandatory — a nav entry can't ship half-filled. The looser link global field, where every subfield is optional, is used where blank links are legitimate, like this guide's own doc links. Both are fully editable in Live Preview and Visual Editor."),
      field_tags: ["navigation", "header", "footer", "nav_link", "link"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/headless-cms/reference"),
    },
    {
      anchor_id: "personalization",
      icon: "users",
      heading: "Personalization with Lytics",
      description: rte("Flixstack tracks viewing behaviour, searches, and playback events into Lytics, then resolves which of five audience segments a visitor belongs to. Resolution happens server-side via the Lytics Entity API and is exposed through the /api/lytics/segment route; /profile shows the segments resolved for the current visitor. Wiring those segments into the content itself — swapping the hero, reordering rails, or serving Contentstack Personalize variants — is the natural next step and is left as the extension point for you to build."),
      field_tags: ["action_fan", "binge_watcher", "new_user", "premium_subscriber", "lapsed_user"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/personalize/about-personalize"),
    },
    {
      anchor_id: "automations",
      icon: "bot",
      heading: "Agent OS & Automations",
      description: rte("Automations are how content operations scale without a human in the loop: an entry publishes, a webhook fires, an agent enriches the entry, and the Management API writes the result back. Three worked blueprints ship with this project in docs/automations.md — AI auto-tagging on publish, scheduled availability expiry, and new-episode notifications — each with its real webhook and Management API payloads, ready to build in your own stack."),
      field_tags: ["Auto-tagging pipeline", "Availability expiry", "New episode notifications"],
      learn_link: link("Learn More", "https://www.contentstack.com/docs/agent-os/what-is-an-automation"),
    },
  ],
  docs_heading: "Explore the Docs",
  doc_links: [
    { link: link("Content Delivery API", "https://www.contentstack.com/docs/developers/apis/content-delivery-api"), description: "Fetch entries, assets, and queries" },
    { link: link("Content Management API", "https://www.contentstack.com/docs/developers/apis/content-management-api"), description: "Create, update, publish content" },
    { link: link("Live Preview for Next.js", "https://www.contentstack.com/docs/headless-cms/live-preview-implementation-for-nextjs-ssr-app-router"), description: "The App Router setup this app uses" },
    { link: link("Visual Editor", "https://www.contentstack.com/docs/headless-cms/about-visual-editor"), description: "Edit content on the page itself" },
    { link: link("Automations", "https://www.contentstack.com/docs/agent-os/what-is-an-automation"), description: "Automate content ops with Agent OS" },
    { link: link("Launch", "https://www.contentstack.com/docs/launch/about-launch"), description: "Deploy and host this app" },
  ],
};

// ---- Run ---------------------------------------------------
async function upsertContentType() {
  let exists = true;
  try {
    await cma("GET", `/content_types/${CT_UID}`);
  } catch (err) {
    if (err.status !== 404 && err.status !== 422) throw err;
    exists = false;
  }
  const verb = exists ? "Updating" : "Creating";
  if (DRY) {
    console.log(`  [dry] ${verb} content type '${CT_UID}'`);
    console.log(`        options: ${JSON.stringify(contentType.options)}`);
    console.log(`        fields:  ${contentType.schema.map((f) => f.uid).join(", ")}`);
    return;
  }
  console.log(`  ${exists ? "↻" : "+"} ${verb} content type '${CT_UID}'…`);
  if (exists) await cma("PUT", `/content_types/${CT_UID}`, { content_type: contentType });
  else await cma("POST", `/content_types`, { content_type: contentType });
}

async function upsertEntry() {
  const existing = await cma("GET", `/content_types/${CT_UID}/entries?only[BASE][]=uid&limit=1`);
  const found = existing.entries?.[0]?.uid;
  if (DRY) {
    console.log(`  [dry] ${found ? `Updating entry ${found}` : "Creating entry"}`);
    console.log(`        url: ${entry.url}  ·  ${entry.steps.length} steps, ${entry.features.length} features, ${entry.doc_links.length} doc links`);
    entry.steps.forEach((s, i) => console.log(`        ${i + 1}. ${s.heading}`));
    return found ?? "(new)";
  }
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
  const all = environments.map((e) => e.name);
  if (!all.length) { console.log("  (no environments to publish to)"); return; }

  // Publish only where asked. Unknown names are dropped with a warning rather
  // than sent, so a typo can't silently fall back to publishing everywhere.
  let names;
  if (ENV_TARGET === "all") {
    names = all;
  } else {
    const wanted = ENV_TARGET.split(",").map((s) => s.trim()).filter(Boolean);
    names = wanted.filter((n) => all.includes(n));
    const unknown = wanted.filter((n) => !all.includes(n));
    if (unknown.length) console.log(`  ! unknown environment(s) skipped: ${unknown.join(", ")} (stack has: ${all.join(", ")})`);
    if (!names.length) { console.log("  ! nothing to publish to — skipping publish"); return; }
  }

  if (DRY) { console.log(`  [dry] Would publish to: ${names.join(", ")}`); return; }
  console.log(`  ⇪ Publishing to: ${names.join(", ")}`);
  await cma("POST", `/content_types/${CT_UID}/entries/${entryUid}/publish`, {
    entry: { environments: names, locales: [LOCALE] },
  });
}

async function main() {
  console.log(`\n🛠  setup_guide provisioning  (branch: ${BRANCH}, region: ${REGION}, publish: ${ENV_TARGET})${DRY ? "  [DRY RUN — no writes]" : ""}\n`);
  await upsertContentType();
  const entryUid = await upsertEntry();
  await publish(entryUid);
  console.log(DRY ? "\n✓ Dry run complete — nothing was written.\n" : `\n✓ Done. setup_guide entry ${entryUid} is live.\n`);
}

main().catch((err) => { console.error("\n✗ Failed:", err.message); process.exit(1); });
