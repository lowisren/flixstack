// ============================================================
// Fallback content for the /setup Developer Guide.
//
// Mirrors the `setup_guide` singleton entry in Contentstack. Used by
// `getSetupGuide` when the stack isn't configured (or a delivery error occurs),
// so /setup renders identically with or without a CMS connection.
//
// Prose fields hold the same HTML that `normalizeSetupGuide` produces from the
// JSON RTE fields (so the page renders them the same way in both paths).
// To change the live copy, edit the entry in Contentstack (or re-run
// `node scripts/seed-setup-guide.mjs`), not this file.
// ============================================================

import type { SetupGuide } from "./types";

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

export const SETUP_GUIDE_FALLBACK: SetupGuide = {
  uid: "fallback",
  title: "Flixstack Setup Guide",
  badge_label: "Developer Guide",
  intro:
    "<p>Get Flixstack connected to Contentstack in under 10 minutes. This guide walks you through every step and explains what each Contentstack feature does in the context of the site.</p>",
  steps_heading: "Setup Steps",
  steps: [
    {
      heading: "Create a Contentstack Stack",
      description: "<p>A stack is your project workspace in Contentstack. Think of it as your database + API in one.</p>",
      detail: "<p>Sign in to Contentstack → Click 'New Stack' → Name it 'Flixstack' → Choose your region.</p>",
      docs_link: { label: "View Documentation", href: "https://www.contentstack.com/docs/developers/create-stack", open_in_new_tab: true },
    },
    {
      heading: "Import the Content Models",
      description:
        "<p>Import the pre-built schema — 13 content types and 6 global fields — from content-models/export.json into your stack. The content_tags taxonomy is created separately in the next step.</p>",
      detail: "<p>In your stack → Settings → Import/Export → Import stack → Upload content-models/export.json</p>",
      docs_link: { label: "View Documentation", href: "https://www.contentstack.com/docs/developers/apis/content-management-api", open_in_new_tab: true },
    },
    {
      heading: "Configure Environment Variables",
      description: "<p>Copy your API credentials from Contentstack and add them to .env.local.</p>",
      code: ENV_CODE,
      docs_link: { label: "View Documentation", href: "https://www.contentstack.com/docs/developers/apis/content-delivery-api", open_in_new_tab: true },
    },
    {
      heading: "Seed the Taxonomy & Sample Content",
      description:
        "<p>Create the content_tags taxonomy terms, then populate your stack with movies, shows, genres, and people. Entries reference taxonomy terms, so the terms must exist first.</p>",
      code: SEED_CODE,
    },
    {
      heading: "Connect Lytics (Optional)",
      description: "<p>Enable audience segmentation and personalized content by connecting your Lytics workspace.</p>",
      detail:
        "<p>Create a Lytics account → Get your Account ID → Add NEXT_PUBLIC_LYTICS_ACCOUNT_ID to .env.local. The site will automatically track title views, search queries, and playback events.</p>",
      docs_link: { label: "View Documentation", href: "https://docs.lytics.com", open_in_new_tab: true },
    },
    {
      heading: "Run the App",
      description: "<p>Start the development server and explore the site with Contentstack Inspector enabled.</p>",
      code: RUN_CODE,
    },
  ],
  features_heading: "Contentstack Features in Flixstack",
  features_intro:
    "<p>Every feature on the site maps to a specific Contentstack capability. Open any entry in Contentstack and launch Visual Builder to see and edit the content model behind any component, live.</p>",
  features: [
    {
      anchor_id: "content-models",
      icon: "database",
      heading: "Content Models",
      description:
        "<p>13 structured content types define every piece of content on the site — from a single movie to a full homepage rail. Movies and TV series share their common fields (rating, artwork, availability, tags) through reusable global fields and a taxonomy, so the model stays DRY. Field types in use: Short Text, Rich Text, File, Reference, Select, Boolean, Group, Global Field, and Taxonomy.</p>",
      field_tags: ["movie", "tv_series", "episode", "person", "genre", "hero_banner", "homepage_rail", "page", "navigation", "site_config", "header", "footer", "setup_guide"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/create-a-content-type", open_in_new_tab: true },
    },
    {
      anchor_id: "modular-blocks",
      icon: "layers",
      heading: "Modular Blocks",
      description:
        "<p>Homepage rails, hero banners, and promo sections are modular blocks — composable page sections that editors can arrange freely without engineering changes. Open Dev Mode and click any rail to see its block type.</p>",
      field_tags: ["hero_block", "rail_block", "promo_block", "genre_spotlight_block"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/create-a-content-type/understand-modular-blocks", open_in_new_tab: true },
    },
    {
      anchor_id: "global-fields",
      icon: "zap",
      heading: "Global Fields",
      description:
        "<p>Six reusable field groups keep the model DRY. title_metadata (rating, tier, release date, score) and artwork (hero image, thumbnail) are shared by movies and TV series; cta and link standardize buttons and navigation links across the site; seo and availability_window round out the set. Edit a global field once and every content type using it updates.</p>",
      field_tags: ["title_metadata", "artwork", "cta", "link", "seo", "availability_window"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/create-a-content-type/understanding-global-fields", open_in_new_tab: true },
    },
    {
      anchor_id: "taxonomy",
      icon: "tags",
      heading: "Taxonomy",
      description:
        "<p>Content tags are a governed taxonomy, not free text. Editors pick from a shared vocabulary of terms attached to movies and TV series, so tagging stays consistent, filterable, and reusable across the whole catalog.</p>",
      field_tags: ["content_tags", "governed terms"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/taxonomy", open_in_new_tab: true },
    },
    {
      anchor_id: "header-footer-nav",
      icon: "layers",
      heading: "Header, Footer & Navigation",
      description:
        "<p>The main nav and footer nav are separate, reusable navigation entries whose links use the shared link global field — reference one navigation entry from the header content type, or from any footer column. Both are fully editable in Live Preview / Visual Builder.</p>",
      field_tags: ["navigation", "header", "footer", "link"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/references/add-a-reference-field", open_in_new_tab: true },
    },
    {
      anchor_id: "personalization",
      icon: "users",
      heading: "Personalization with Lytics",
      description:
        "<p>The hero banner and featured rail adapt to five Lytics audience segments. The site tracks viewing behavior and Lytics resolves which segment a visitor belongs to — Contentstack then serves the matching content variant.</p>",
      field_tags: ["action_fan", "binge_watcher", "new_user", "premium_subscriber", "lapsed_user"],
      learn_link: { label: "Learn More", href: "https://docs.lytics.com", open_in_new_tab: true },
    },
    {
      anchor_id: "automations",
      icon: "bot",
      heading: "Agent OS & Automations",
      description:
        "<p>Three Automation Hub workflows show how to automate content operations: auto-tagging new titles with AI, expiring content on a schedule, and triggering notifications when new episodes publish.</p>",
      field_tags: ["Auto-tagging pipeline", "Availability expiry", "New episode notifications"],
      learn_link: { label: "Learn More", href: "https://www.contentstack.com/docs/developers/automation-hub", open_in_new_tab: true },
    },
  ],
  docs_heading: "Explore the Docs",
  doc_links: [
    { link: { label: "Content Delivery API", href: "https://www.contentstack.com/docs/developers/apis/content-delivery-api", open_in_new_tab: true }, description: "Fetch entries, assets, and queries" },
    { link: { label: "Content Management API", href: "https://www.contentstack.com/docs/developers/apis/content-management-api", open_in_new_tab: true }, description: "Create, update, publish content" },
    { link: { label: "Automation Hub", href: "https://www.contentstack.com/docs/developers/automation-hub", open_in_new_tab: true }, description: "Build no-code content workflows" },
    { link: { label: "Personalize with Lytics", href: "https://www.contentstack.com/docs/developers/personalization", open_in_new_tab: true }, description: "Audience segmentation & variants" },
  ],
};
