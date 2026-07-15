# Flixstack

A ContentStack starter template — a fully functional movie and TV streaming platform (Netflix-style) built to teach developers how to build on [ContentStack](https://contentstack.com).

**Tech Stack:** Next.js 16 · ContentStack · Tailwind CSS v4 · TypeScript · Lytics

---

## Quick Start

```bash
pnpm install
pnpm dev
# → http://localhost:3000
```

All content and images are served live from ContentStack — there is no mock-data fallback in the app itself. A ContentStack account and populated stack are required (see below). `src/lib/mock-data.ts` still exists purely as seed source data for `scripts/seed.ts`/`scripts/upload-assets.ts`.

---

## Connect ContentStack (10 minutes)

```bash
cp .env.local.example .env.local
# Fill in your ContentStack credentials — see /setup for a step-by-step guide
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_CONTENTSTACK_API_KEY` | Stack → Settings → API Keys |
| `NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN` | Stack → Settings → Tokens → Delivery |
| `NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT` | Stack → Environments |
| `NEXT_PUBLIC_CONTENTSTACK_REGION` | `US` (default), `EU`, `AZURE_NA`, `AZURE_EU`, `GCP_NA`, `GCP_EU` |
| `CONTENTSTACK_PREVIEW_TOKEN` | Stack → Settings → Tokens → create/attach a Preview Token — required for Live Preview / Visual Builder. Server-only, never prefix with `NEXT_PUBLIC_` |
| `CONTENTSTACK_MANAGEMENT_TOKEN` | Stack → Settings → Tokens → Management Token — only needed for `pnpm seed` / `pnpm upload-assets` |

Then import the content models and seed content:

```bash
# Import via ContentStack Dashboard:
# Stack → Settings → Import/Export → Import Stack → content-models/export.json

# Create the governed content_tags taxonomy terms (reads tokens from .env.local):
node scripts/migrate-v2.mjs terms

# Seed sample content + upload/link images:
pnpm seed
pnpm upload-assets

# Create + publish the /setup Developer Guide entry:
node scripts/seed-setup-guide.mjs

# Publish seeded entries + assets to your environment from the ContentStack dashboard,
# or via the Contentstack MCP tools if you're driving this with an AI agent.
```

Visit `/setup` in the running app for the full guided walkthrough.

---

## Pages & Features

| Page | URL | ContentStack Feature Shown |
| --- | --- | --- |
| Home | `/` | Hero banners, modular block rails, Lytics personalization |
| Browse | `/browse` | Taxonomy filtering, multi-type queries |
| Title detail | `/watch/[slug]` | References, ISR revalidation, related content |
| Genre | `/genre/[slug]` | Dynamic routes from taxonomy entries |
| Search | `/search` | ContentStack full-text search API |
| Profile | `/profile` | Lytics segment tracking and preference management |
| Dev Setup | `/setup` | Guided developer onboarding — driven entirely by the `setup_guide` singleton (JSON RTE, groups, governed enum icons) |

### Live Preview & Visual Builder

Open any entry in the Contentstack dashboard and launch Visual Builder — the running app loads in an iframe with every editable field highlighted via `data-cslp` tags (title, synopsis, images, etc.). Edits reflect on the page live via `@contentstack/live-preview-utils`, no manual refresh needed. Requires `CONTENTSTACK_PREVIEW_TOKEN` to be set and the environment's Visual Builder website URL configured in ContentStack Settings.

### Themes

Light mode / dark mode toggle in the header. Defaults to OS preference. Green accent (`#16A34A` / `#4ADE80`) is WCAG AA compliant in both themes.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
├── components/
│   ├── ui/                 # Button, Badge, Skeleton
│   ├── layout/             # Header, Footer, ThemeToggle, Providers
│   ├── streaming/          # TitleCard, Rail, Hero
│   ├── cms/                # ModularBlockRenderer
│   └── contentstack/       # LivePreviewInit (Visual Builder bridge)
└── lib/
    ├── contentstack/       # SDK client, normalize (editable tags + RTE), typed queries
    ├── lytics/             # CDP event tracking + server-side segments
    ├── mock-data.ts        # Seed source for scripts/seed.ts + upload-assets.ts only
    ├── setup-fallback.ts   # Fallback content for /setup when the stack is unconfigured
    ├── types.ts            # TypeScript types matching content models
    └── utils.ts

content-models/export.json    # Importable ContentStack stack schema (13 types, 6 global fields)
scripts/seed.ts               # Seed script (Management SDK)
scripts/upload-assets.ts      # Uploads + links images to seeded entries
scripts/migrate-v2.mjs        # Structured-content migration (global fields, taxonomy, enums)
scripts/seed-setup-guide.mjs  # Creates + publishes the setup_guide content type & entry
docs/                         # Deep-dive guides for each feature
```

---

## ContentStack Content Models

Flixstack uses a **structured-content** model: fields shared across types are extracted into reusable **global fields**, tags are a governed **taxonomy** (not free text), and rich text uses **JSON RTE**. The full, importable schema lives in `content-models/export.json`. 13 content types:

| Type | Key Fields |
| --- | --- |
| `movie` | title, synopsis (JSON RTE), runtime, genres/cast/director (Ref), `title_metadata` + `artwork` (Global Fields), `content_tags` (Taxonomy) |
| `tv_series` | title, synopsis, seasons (Modular Block → episodes), genres/cast/creator (Ref), status, `title_metadata` + `artwork` + `seo` |
| `episode` | title, episode_number, duration, synopsis, thumbnail, air_date |
| `genre` | title, slug, description, color_accent, hero_image, `seo` |
| `person` | name, bio, photo, role (multi-select: actor/director/producer/writer) |
| `hero_banner` | title, subtitle, `cta` (Global Field), background_image, linked_title (Ref) |
| `homepage_rail` | title, rail_type, items (Ref), layout |
| `page` | title, slug, `seo`, sections (Modular Blocks) |
| `navigation` | title, links (`link` Global Field, repeatable) |
| `header` | logo, main_navigation (Ref), `cta`, show_search, show_profile |
| `footer` | columns (group → navigation Ref), legal_text |
| `site_config` | site_name, feature_flags (group) |
| `setup_guide` | Singleton driving `/setup`: intro, steps, feature deep-dives, doc links (JSON RTE + groups + `link` Global Field) |

**Global Fields (6):** `title_metadata` (rating, tier, release date, score), `artwork` (hero/thumbnail), `cta`, `link`, `seo`, `availability_window`

**Taxonomy:** `content_tags` — governed tag vocabulary applied to movies & TV series

**Modular Blocks** (`page.sections`): `hero_block`, `rail_block`, `promo_block`, `genre_spotlight_block`

---

## Lytics Segments

| Segment | Logic | Site Effect |
| --- | --- | --- |
| `action_fan` | Watched ≥ 3 action titles | Action hero banner served |
| `binge_watcher` | ≥ 5 episodes in one session | Continue Watching at top |
| `new_user` | Account &lt; 7 days | Onboarding promo shown |
| `premium_subscriber` | tier = premium | Upsell rail hidden |
| `lapsed_user` | No activity in 30+ days | Welcome Back hero |

---

## Automation Hub Workflows

1. **Auto-tagging** — On entry publish → AI agent writes back SEO metadata
2. **Availability expiry** — Daily cron → unpublishes titles past their window
3. **Episode notifications** — New episode published → notify watchlisted users

See docs/automations.md for webhook schemas and setup steps.

---

## Accessibility

WCAG 2.1 Level AA. See docs/accessibility.md.

Key implementations:

- Skip to main content link
- `aria-label` on all icon-only controls
- Keyboard-navigable rails and hero carousel
- `prefers-reduced-motion` support
- Focus-visible rings in green on all interactive elements

---

## License

MIT — use freely as a starting point for your Contentstack projects.