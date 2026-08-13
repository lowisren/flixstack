// ============================================================
// Fallback content for the /setup Developer Guide.
//
// Mirrors the `setup_guide` singleton entry in Contentstack. Used by
// `getSetupGuide` when the stack isn't configured (or a delivery error occurs),
// so /setup renders identically with or without a CMS connection.
//
// Prose fields hold the same HTML that `normalizeSetupGuide` produces from the
// JSON RTE fields (so the page renders them the same way in both paths) — one
// <p> per source paragraph.
// To change the live copy, edit the entry in Contentstack (or re-run
// `node scripts/seed-setup-guide.mjs`), not this file. Keep the two in sync:
// this file is the mirror, that script is the source of truth.
// ============================================================

import type { SetupGuide } from "./types";

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

const DOCS = "https://www.contentstack.com/docs";

export const SETUP_GUIDE_FALLBACK: SetupGuide = {
  uid: "fallback",
  title: "Flixstack Setup Guide",
  badge_label: "Developer Guide",
  intro:
    "<p>Get Flixstack running against your own Contentstack stack in about 20 minutes. Steps 1 to 8 take you from an empty stack to a fully populated, published site; steps 9 and 10 are optional extras. Each step also explains what the Contentstack feature behind it actually does.</p>",
  steps_heading: "Setup Steps",
  steps: [
    {
      heading: "Create a Contentstack Stack",
      description:
        "<p>A stack is your project workspace in Contentstack — your content model, content, and delivery APIs in one place.</p>",
      detail:
        "<p>Sign in to Contentstack → click 'New Stack' → name it 'Flixstack' → choose your region. Note which region you pick: it has to match NEXT_PUBLIC_CONTENTSTACK_REGION in step 3, because every region has its own API host.</p>",
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/create-a-new-stack`, open_in_new_tab: true },
    },
    {
      heading: "Create Your Tokens",
      description:
        "<p>Flixstack needs three credentials, created in two places in your stack. Grab them all now — later steps fail without them.</p>",
      detail:
        "<p>Settings → Tokens → Delivery Tokens → 'Create New Token': pick an environment (start with 'development') and turn on the 'Create Preview Token' toggle on the same screen. That gives you both the delivery token (reads published content) and the preview token (reads drafts for Live Preview).</p><p>Settings → Tokens → Management Tokens → 'Create New Token': this one writes, and is what the import, seed, and asset scripts in the next steps authenticate with. Also note your environment names — you need one in step 3.</p>",
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/create-a-delivery-token`, open_in_new_tab: true },
    },
    {
      heading: "Configure Environment Variables",
      description:
        "<p>Copy the example env file and fill in the credentials from step 2. Do this before importing the content model — the import runs against the Management API and reads these values.</p>",
      detail:
        "<p>Run cp .env.local.example .env.local, then fill in the blanks. The API key is in Settings → API Credentials. Note that NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW is the master switch for Live Preview and Visual Editor: leave it out and the editor stays dark even with a valid preview token. Values are inlined at build time, so a deployed environment needs them set before its build.</p>",
      code: ENV_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/developers/apis/content-delivery-api`, open_in_new_tab: true },
    },
    {
      heading: "Create the Content Model",
      description:
        "<p>Install dependencies, then build the pre-made schema — 8 global fields and 13 content types — in your stack from content-models/export.json. Run the taxonomy step first: movie and tv_series both bind a taxonomy field to content_tags, so it has to exist before they can be created.</p>",
      detail:
        "<p>export.json is a plain schema document, not a Contentstack CLI export bundle, so the stack UI importer won't accept it — it's applied through the Content Management API instead. Content types are created in rounds, and any that reference something not yet created are retried on the next round, so ordering resolves itself.</p>",
      code: MODEL_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/developers/apis/content-management-api`, open_in_new_tab: true },
    },
    {
      heading: "Seed the Sample Content",
      description:
        "<p>Populate your stack with movies, shows, episodes, genres, and people, seeded from src/lib/mock-data.ts. Everything is created as a draft — nothing is published yet, and the site will still look empty after this step. That's expected: steps 6 and 7 finish the job.</p>",
      code: SEED_CODE,
    },
    {
      heading: "Upload the Artwork",
      description:
        "<p>Upload the poster, thumbnail, and hero images and link them to the entries you just seeded. Skip this and every title card, hero, and episode renders without an image — the entries exist, but their image fields are empty.</p>",
      detail:
        "<p>Driven by assets-backup/manifest.json, which names the entry to match and the field path to set for each placement. Three images are intentionally reused across hero banners, which is why there are more placements than files.</p>",
      code: ASSETS_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/publish-an-entry`, open_in_new_tab: true },
    },
    {
      heading: "Publish Everything",
      description:
        "<p>This is the step that makes the site render. The Content Delivery API only serves published content, so until you publish, your stack is full of entries the app cannot see. Publish after uploading artwork, so the entries go out with their images already attached.</p>",
      detail:
        "<p>Publishing is per environment: an entry published to 'development' is invisible to a delivery token scoped to 'production'. If your stack has a workflow or publish rule on an environment, entries have to reach the required stage before they can go out to it.</p>",
      code: PUBLISH_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/publish-an-entry`, open_in_new_tab: true },
    },
    {
      heading: "Run the App",
      description:
        "<p>Start the dev server. You should now see a fully populated homepage, with artwork, served live from your stack.</p>",
      detail:
        "<p>To edit content in place, Contentstack needs to know where your app lives: set your environment's Base URL, then open any entry and launch Visual Editor. Every editable field on the page carries a data-cslp tag, and edits reflect live without a refresh. Live Preview works on any environment where NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW is true — leave it off in production so the markup renders clean.</p>",
      code: RUN_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/set-up-visual-editor-for-your-website`, open_in_new_tab: true },
    },
    {
      heading: "Polish the Editor Experience (Optional)",
      description:
        "<p>A working model is not the same as a pleasant one to edit. These three scripts apply the field-level guidance, validation, and publishing workflow that make the stack feel finished to a content editor.</p>",
      detail:
        "<p>Worth running even on a throwaway stack: they are the most concrete example in this project of the difference between a schema that validates and a schema an editor can actually work in.</p>",
      code: EDITOR_CODE,
      docs_link: { label: "View Documentation", href: `${DOCS}/headless-cms/create-a-content-type`, open_in_new_tab: true },
    },
    {
      heading: "Connect Lytics (Optional)",
      description:
        "<p>Add a Lytics account to turn on behavioural tracking. The site sends page views, title views, search queries, and playback events, and resolves which audience segments a visitor belongs to.</p>",
      detail:
        "<p>Add your Lytics account ID and server key to .env.local. Segment membership is resolved server-side and exposed through the /api/lytics/segment route; /profile shows the segments resolved for the current visitor. Using those segments to swap the hero or reorder rails is the extension point, not something this starter ships — see the Personalization section below.</p>",
      code: LYTICS_CODE,
      docs_link: { label: "View Documentation", href: "https://docs.lytics.com", open_in_new_tab: true },
    },
  ],
  features_heading: "Contentstack Features in Flixstack",
  features_intro:
    "<p>Every feature on the site maps to a specific Contentstack capability. Open any entry in Contentstack and launch Visual Editor to see and edit the content model behind any component, live.</p>",
  // anchor_id values are deep-linked from src/app/page.tsx, components/layout/footer.tsx
  // and app/profile/profile-client.tsx — renaming one silently breaks those links.
  features: [
    {
      anchor_id: "content-models",
      icon: "database",
      heading: "Content Models",
      description:
        "<p>13 structured content types define every piece of content on the site — from a single movie to a full homepage rail. Movies and TV series share their common fields (rating, artwork, availability, tags) through reusable global fields and a taxonomy, so the model stays DRY. Field types in use: Short Text, JSON Rich Text, File, Reference, Select, Boolean, Group, Modular Blocks, Global Field, and Taxonomy.</p>",
      field_tags: ["movie", "tv_series", "episode", "person", "genre", "hero_banner", "homepage_rail", "page", "navigation", "site_config", "header", "footer", "setup_guide"],
      learn_link: { label: "Learn More", href: `${DOCS}/headless-cms/create-a-content-type`, open_in_new_tab: true },
    },
    {
      anchor_id: "modular-blocks",
      icon: "layers",
      heading: "Modular Blocks",
      description:
        "<p>Two fields in the model are modular blocks. The page content type's sections field lets an editor compose a route out of hero, rail, promo, and genre-spotlight blocks in any order, without an engineering change — that's how the home and browse pages are assembled. tv_series.seasons uses one too, nesting each season's episodes inside the series entry. Homepage rails and hero banners are separate content types that the rail and hero blocks reference.</p>",
      field_tags: ["page.sections", "hero_block", "rail_block", "promo_block", "genre_spotlight_block", "tv_series.seasons", "season_block"],
      learn_link: { label: "Learn More", href: `${DOCS}/headless-cms/modular-blocks`, open_in_new_tab: true },
    },
    {
      anchor_id: "global-fields",
      icon: "zap",
      heading: "Global Fields",
      description:
        "<p>Eight reusable field groups keep the model DRY. title_metadata (rating, tier, release date, score) and artwork (hero image, thumbnail) are shared by movies and TV series; playback carries the video source and captions; cta standardizes buttons; link and nav_link standardize the two kinds of link on the site; seo and availability_window round out the set. Edit a global field once and every content type using it picks up the change.</p>",
      field_tags: ["title_metadata", "artwork", "playback", "cta", "link", "nav_link", "seo", "availability_window"],
      learn_link: { label: "Learn More", href: `${DOCS}/headless-cms/about-global-field`, open_in_new_tab: true },
    },
    {
      anchor_id: "taxonomy",
      icon: "tags",
      heading: "Taxonomy",
      description:
        "<p>Content tags are a governed taxonomy, not free text. Editors pick from a shared vocabulary of 77 terms attached to movies and TV series, so tagging stays consistent, filterable, and reusable across the whole catalog — and a typo can't quietly create a new tag.</p>",
      field_tags: ["content_tags", "77 governed terms"],
      learn_link: { label: "Learn More", href: `${DOCS}/headless-cms/about-taxonomy`, open_in_new_tab: true },
    },
    {
      anchor_id: "header-footer-nav",
      icon: "layers",
      heading: "Header, Footer & Navigation",
      description:
        "<p>The main nav and the footer navs are separate, reusable navigation entries, referenced from the header content type and from each footer column. Their links use the nav_link global field, where a label and href are mandatory — a nav entry can't ship half-filled. The looser link global field, where every subfield is optional, is used where blank links are legitimate, like this guide's own doc links. Both are fully editable in Live Preview and Visual Editor.</p>",
      field_tags: ["navigation", "header", "footer", "nav_link", "link"],
      learn_link: { label: "Learn More", href: `${DOCS}/headless-cms/reference`, open_in_new_tab: true },
    },
    {
      anchor_id: "personalization",
      icon: "users",
      heading: "Personalization with Lytics",
      description:
        "<p>Flixstack tracks viewing behaviour, searches, and playback events into Lytics, then resolves which of five audience segments a visitor belongs to. Resolution happens server-side via the Lytics Entity API and is exposed through the /api/lytics/segment route; /profile shows the segments resolved for the current visitor. Wiring those segments into the content itself — swapping the hero, reordering rails, or serving Contentstack Personalize variants — is the natural next step and is left as the extension point for you to build.</p>",
      field_tags: ["action_fan", "binge_watcher", "new_user", "premium_subscriber", "lapsed_user"],
      learn_link: { label: "Learn More", href: `${DOCS}/personalize/about-personalize`, open_in_new_tab: true },
    },
    {
      anchor_id: "automations",
      icon: "bot",
      heading: "Agent OS & Automations",
      description:
        "<p>Automations are how content operations scale without a human in the loop: an entry publishes, a webhook fires, an agent enriches the entry, and the Management API writes the result back. Three worked blueprints ship with this project in docs/automations.md — AI auto-tagging on publish, scheduled availability expiry, and new-episode notifications — each with its real webhook and Management API payloads, ready to build in your own stack.</p>",
      field_tags: ["Auto-tagging pipeline", "Availability expiry", "New episode notifications"],
      learn_link: { label: "Learn More", href: `${DOCS}/agent-os/what-is-an-automation`, open_in_new_tab: true },
    },
  ],
  docs_heading: "Explore the Docs",
  doc_links: [
    { link: { label: "Content Delivery API", href: `${DOCS}/developers/apis/content-delivery-api`, open_in_new_tab: true }, description: "Fetch entries, assets, and queries" },
    { link: { label: "Content Management API", href: `${DOCS}/developers/apis/content-management-api`, open_in_new_tab: true }, description: "Create, update, publish content" },
    { link: { label: "Live Preview for Next.js", href: `${DOCS}/headless-cms/live-preview-implementation-for-nextjs-ssr-app-router`, open_in_new_tab: true }, description: "The App Router setup this app uses" },
    { link: { label: "Visual Editor", href: `${DOCS}/headless-cms/about-visual-editor`, open_in_new_tab: true }, description: "Edit content on the page itself" },
    { link: { label: "Automations", href: `${DOCS}/agent-os/what-is-an-automation`, open_in_new_tab: true }, description: "Automate content ops with Agent OS" },
    { link: { label: "Launch", href: `${DOCS}/launch/about-launch`, open_in_new_tab: true }, description: "Deploy and host this app" },
  ],
};
