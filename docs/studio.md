# Contentstack Studio in Flixstack

Studio lets editors lay out landing pages visually, from Flixstack's own components, without a code change. The pages live at **`/collections/<slug>`**. Every other route (`/`, `/movie`, `/watch/...`) is unchanged and built in code.

- **Studio project:** "Flix Studio", on the `blt2714f2503dfc1b5f` stack. Templates and sections are stored as entries of the `compositions` content type, which Studio manages. Don't edit those entries by hand.
- **Environment:** `development` (the Launch development site). Production go-live of Studio pages hasn't happened yet; see [Limits](#limits).
- **How it was built:** decisions and per-phase results are in [`studio-plan.md`](studio-plan.md).

---

## For editors

### Make a new collection page

1. In Contentstack, create a **Landing Page** entry:

   | Field | What to enter |
   |---|---|
   | Title | The page name, also the fallback browser title |
   | Slug | Lowercase with hyphens, e.g. `summer-blockbusters` |
   | URL | `/collections/` followed by the slug, e.g. `/collections/summer-blockbusters`. The page resolves by this field, so it must match exactly |
   | SEO | The browser title and search description |
   | Hero Banners | Banners for the rotating hero |
   | Callouts | Short highlights (heading and body) |
   | Featured Title | One movie or series to spotlight |
   | Rails | Existing Homepage Rail entries, in display order |
   | Promo | Eyebrow, headline, body, image and call to action |
   | Genre | One genre to spotlight |

2. **Publish** it to `development`. The page is at `https://flixstack-development-85a155.contentstackapps.com/collections/<slug>`.

That's all you need: the **Collection page** template lays out every Landing Page the same way. Leave a list or reference field empty and its pattern shows a "Bind … to show content here" placeholder in Studio, and nothing on the live page.

### Change the layout

Open the **Collection page** template in Studio to reorder, remove or add sections. A change to the template applies to every collection page. Studio previews it with a real entry; pick which one under the preview entry selector.

**The sections it uses:**

| Section | Shows | Bound to |
|---|---|---|
| Hero Carousel | The rotating hero | Hero Banners |
| Feature Callouts | One panel per callout | Callouts |
| Title Spotlight | Artwork, rating, score, synopsis, "Watch now" | Featured Title |
| Title Rails | One scrolling rail per rail entry | Rails |
| Promo | Image plus copy and CTA. Set **Image on the right** per placement | Promo |
| Genre Spotlight | Artwork, name, description, "Browse the genre" | Genre |
| Open Section | A heading plus a free drop area for any component or section | nothing |

**Two rules to keep:**
- **After editing a template or section, Deploy (publish) it.** The site serves the last published version, even though Studio shows your edit.
- **Edit content in the entry, not in Studio.** Bound text and images come from the Landing Page entry. Click a bound value in Visual Editor to jump to its field.

### Palette

Under **Registered Components**, the FlixStack components are grouped as **Elements** (heading, text, image, button link…), **Layout** (section shell, stack, row, grid, panel) and **Patterns** (hero carousel, title rail, title grid, title card).

### Section thumbnails

The section thumbnails are generated diagrams. To replace one with a real screenshot, open the section in Studio and press **Save**.

---

## For developers

### Where things are

| Path | What it does |
|---|---|
| `src/lib/studio/sdk.ts` | Studio's own Delivery stack and `studioSdk.init` (`cslp.appendTags`) |
| `src/studio/schemas.ts` | Every registered component's palette name, thumbnail and prop schema. Pure data |
| `src/studio/register.ts` | Pairs each schema with its adapter; registers components and breakpoints. **Client graph only** |
| `src/studio/components/` | Adapters: Studio props → design-system components (`atoms`, `layout`, `composites`) |
| `src/studio/thumbnails.ts` | Inline-SVG palette thumbnails, in the dark theme's token colours |
| `src/app/studio-init.tsx` | Runs the init and registrations in the browser; rendered from the root layout |
| `src/app/canvas/page.tsx` | Studio's section canvas (the project's Canvas URL) |
| `src/app/collections/[slug]/page.tsx` | Renders the Collection page template |
| `scripts/studio/seed-compositions.ts` | `npm run studio:seed`: writes and publishes the sections and template |

### How rendering works

**`studioSdk.init` is a per-process singleton,** and Studio only ever *sets* a live-preview hash on its stack (it never clears one). So:
- **The server-side instance is published-only.** `/collections/[slug]` renders published compositions on the server, answers the app's 404 when nothing matches, and rethrows real failures as 500.
- **Studio editor requests and `live_preview` requests render in the browser,** via `useCompositionData`, so a draft hash never touches the server singleton.
- **The browser instance previews drafts** when `NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW=true` and `NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN` is set. Set the token on the development Launch environment only, never production.

**On `/canvas`,** site chrome, Live Preview and Lytics stand down (`src/studio/canvas-path.ts`), and only `*.contentstack.com` may frame the page (`next.config.ts`).

### Add a component to the palette

1. **Build it in the design system first.** It gets a `/design-system` specimen and must pass the guardrails in `src/design-system/README.md`.
2. **Add an adapter** in `src/studio/components/`, with:
   - `studioAttributes` spread **last** on a real DOM root (never a Fragment);
   - a `$<prop>?: Cslptag` per bindable prop, spread on the element that renders it;
   - empty values still rendering their element, so an empty field stays clickable;
   - images accepting `string | { url }`.
3. **Add its schema** to `src/studio/schemas.ts`, with these rules:
   - `defaultValue`, never `default`, on every prop that has a default;
   - design props are `choice` with `options` (stored as arrays);
   - a group or list is `object` or `array`, never `any`, which flattens single-key objects and renders blank;
   - add a `thumbnails.ts` entry.
4. **Add it to `ADAPTERS`** in `register.ts`. TypeScript fails until schema and adapter match.

A Studio page needs a **deployed** canvas: the palette loads from the Launch development site, not localhost.

### Change the sections or template

Edit `SECTIONS` / `TEMPLATES` in `scripts/studio/seed-compositions.ts`, then run:

```bash
npm run studio:seed -- --dry          # build + validate every tree, write nothing
npm run studio:seed                   # write + publish all (idempotent, by composable_uid)
npm run studio:seed -- --only=promo   # one composition
```

It writes every registered prop, preflights each tree before writing and again on read-back, and refuses to publish to production. **It overwrites edits made to the same compositions in Studio**, so pick one owner per composition. To keep a Studio-side edit, stop seeding that composition.

### A new template with a new URL prefix

Routes are dedicated, not a catch-all, so a template at `/<prefix>/...` needs a route like `src/app/collections/[slug]/page.tsx` at `src/app/<prefix>/[slug]/page.tsx`. Give every template a literal prefix: a bare `{{entry.url}}` pattern claims other templates' URLs.

### Checking it

- **Visual parity of existing routes:** `npm run snapshot` (see `scripts/snapshot.mjs`).
- **Registration contract:** 18 schemas = 18 adapters in `ADAPTERS`, and every adapter spreads `studioAttributes`.
- **Template structure:** the seed script fails if the template's section nodes and `linked_sections` don't match.

---

## Limits

- **Freeform templates and design tokens aren't enabled.** That rules out pinned queries, so Genre Spotlight has no grid of the genre's titles.
- **Production:** the code is deployed there, but `/collections/*` returns 404 until compositions and entries are published to production. That's gated by the Editorial Review workflow and needs an approver.
- **Title:** an SEO title ending "— Flixstack" gets "| Flixstack" appended by the root title template. This is site-wide.
