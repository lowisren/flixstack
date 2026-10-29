# Contentstack Studio for FlixStack: plan

Status: **approved 2026-10-22.** D1: use the existing UI-created project "Flix Studio". D2: new `landing_page`. D3: scripted. D4: changed to the existing `development` environment (no `studio-local`). The canvas loads from the Launch development site, so the canvas needs a deploy to see code changes. D5: deferred. D6: dedicated `/collections/[slug]`.

Previously: **draft for review. Nothing has been built.** The only stack calls made while writing this were reads (environments, `page` entries).

Sources:
- Studio docs: https://studio-documentation.contentstackapps.com, abbreviated **[docs]** below.
- The installed `contentstack-skills:studio` pack, abbreviated **[pack]**.
- An inventory of this repo on `feat/design-system`.
- Read-only checks against stack `blt2714f2503dfc1b5f` (org `blt8c8e9072526ebb21`) through the claude.ai Contentstack connector.

---

## 1. In plain language

Today a developer decides how every FlixStack page looks. The `/movie`, `/tv-show` and `/browse` pages let editors reorder a few blocks, but nobody can lay out a new page without a code change.

When this plan is done, a marketer can open Contentstack Studio and build a landing page such as "Halloween Horror Picks" by dragging FlixStack's own pieces onto a canvas: the hero carousel, title rails, promo panels and genre spotlights. They fill those pieces with real movies and series from the stack, preview the page and deploy it. It looks exactly like the rest of the site because it uses the same components.

What changes:
- **New capability:** pages under `/collections/<slug>` (and optionally `/campaigns/<name>`) are built in Studio.
- **No change to existing pages:** `/`, `/movie`, `/watch/...` and every other current page keep their current code, URLs and Live Preview behaviour.
- **One new content type:** `landing_page`, plus the `compositions` content type that Studio creates and manages itself.
- **Development only:** everything goes to the `development` environment. Production go-live is a separate, later step because production publishing is gated by the Editorial Review workflow.

---

## 2. Decisions I need from you

My recommendation is listed first in each row.

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| D1 | **How to create the Studio project** | **You click "New Project" in the Studio UI** (about 2 minutes). Studio then creates the `compositions` content type with exactly the schema it needs. I configure and verify everything after that. | **I create it by API.** This needs an OAuth token for the Studio API, which the claude.ai connector doesn't expose to me. I'd have to read or refresh the local MCP session (rotating its refresh token) or have you run `csdx login --oauth`. I'd also have to hand-build the 13-field compositions content type, because the Studio API "never creates one" [docs]. That's possible, but it's where most of the silent failures in [pack] come from. |
| D2 | **Which content type Studio pages bind to** | **A new `landing_page` content type** used only by Studio. Editors keep `page` for the routes it already drives. | **Reuse `page`.** This needs no model change, but then every existing `page` entry (homepage, browse, movie, tv-show) also gets a Studio URL, and the two systems blur together for editors. |
| D3 | **Who builds the starter sections and templates** | **I script them** (`scripts/studio/seed-compositions.mjs`, re-runnable like the existing seed scripts) through the CMA, following [pack] `author-composition-via-api`, then verify the structure. | (b) I deliver the registered components plus a walkthrough, and you build the sections and templates in the Studio UI while I verify. (c) A mix of the two: I script one section and one template as a reference, and you build the rest. |
| D4 | **Where the canvas loads from while building** | **A new stack environment `studio-local` pointing at `https://localhost:3000`**, served over local HTTPS with mkcert, so the canvas runs against your dev server. Switch the project to `development` when going live. | Point the project at `development` (the Launch dev URL) from day one. Every component change is then a Launch deploy before it shows up in the canvas. |
| D5 | **Freeform templates** (the one-off `/campaigns/...` page from pinned queries, plus the Design tab and design tokens) | **Defer to phase 9.** Do Connected templates first. | Include it in the first pass. It needs the project's "Enable Freeform Feature" toggle. |
| D6 | **Routing for Studio pages** | **Dedicated routes:** `app/collections/[slug]` (and later `app/campaigns/[slug]`) share one renderer. | **One catch-all `app/[...slug]`.** This is what [pack] defaults to, but `app/[slug]` already owns every single-segment URL (it redirects to `/watch`), and a catch-all would also have to stay out of the way of `/watch`, `/genre` and others. The trade-off of dedicated routes is that a template with a new URL prefix needs a one-line route added by a developer. |

---

## 3. What exists today

- **Framework:**
  - Next **16.2.9** with the App Router, React 19.2.4 and Tailwind v4.
  - Every content route renders on the server per request, because it awaits `searchParams` for Live Preview.
  - `AGENTS.md`: read `node_modules/next/dist/docs/` before writing route code, since 16 has breaking changes. The Studio App Router guide is written for Next 15.
- **Contentstack:**
  - `@contentstack/delivery-sdk` 5.5.2 and `live-preview-utils` 4.4.5. Live Preview and Visual Builder are already wired: `LivePreviewInit` uses `ssr:true` and `mode:"builder"`, and every normalized entry carries `addEditableTags`.
  - `queries.ts` calls `livePreviewQuery` on its stack instance, so Studio needs **its own stack instance** [pack, docs].
  - There is no Studio package, `/canvas` route or catch-all yet.
- **Stack** (verified read-only):
  - Environments `development` (`blt03fa5259e0641aa4`, Launch dev URL) and `production`.
  - Locale `en-us`, branch `main`, 13 content types, and **no `compositions` content type**. That's intentional: it wasn't migrated.
- **Design system** (`src/design-system/`):
  - **Primitives:** atomic, with no CMS types.
  - **Patterns.**
  - **Sections:** CMS-typed composites.
  - **Templates:** layout only.
  - **Guardrails** (`src/design-system/README.md`):
    - only sections know about Contentstack;
    - tokens only, enforced by ESLint;
    - each new component gets a `/design-system` specimen;
    - lint, contrast and a11y checks, and the snapshot parity diff, must pass.

### Delivery SDK version risk

[docs] say the Studio SDK "is built against Delivery SDK 4.5 and later 4.x". FlixStack is on 5.x. `@contentstack/studio-react@2.0.1` does **not** depend on the Delivery SDK (peer dependencies are only `react`/`react-dom` `^18 || ^19`); the app passes its stack in as `stackSdk`.

Phase 0 tests this with a spike: Studio init plus `fetchCompositionData` against a 5.x stack. **Fallback:** install 4.x under a separate package name used only by Studio's stack (`"delivery-sdk-v4": "npm:@contentstack/delivery-sdk@4"`), leaving the app's 5.x untouched.

---

## 4. Target architecture

```
src/
  lib/studio/
    sdk.ts                  # separate Delivery stack instance + studioSdk.init({ stackSdk, contentTypeUid, cslp:{appendTags:true} })
  studio/
    register.ts             # registerComponents([...]), registerBreakpoints([...]) — client graph only
    components/             # thin adapters: Studio props → design-system components
    thumbnails/             # inline SVG → data: URIs (no currentColor / CSS vars)
  app/
    studio-init.tsx         # "use client"; imports lib/studio/sdk + studio/register; rendered from layout.tsx
    canvas/page.tsx         # "use client"; renders local StudioCanvas wrapper (no dynamic import of the package itself)
    collections/[slug]/
      page.tsx              # server: fetchCompositionData({url, searchQuery}) → notFound() / editor exemption
      studio-page.tsx       # "use client"; <StudioComponent specOptions/>
  design-system/primitives/
    stack.tsx row.tsx grid.tsx   # new layout primitives (+ specimens)
```

Key rules, each one a silent failure if it's missed [pack]:
1. **Registration happens only in the client graph,** via `studio-init.tsx` and the client page wrapper. Never from `layout.tsx` directly.
2. **Every adapter follows the same pattern:**
   - `wrap:false`, with `studioAttributes` spread last on a real DOM root;
   - a `$prop?: Cslptag` twin for every bindable prop, spread on the element that renders it;
   - a `thumbnailUrl`;
   - `defaultValue`, never `default`;
   - a unique `flix-*` type.
3. **Catching a missing composition:**
   - `isCompositionNotFound` → `notFound()`.
   - Studio editor requests (`cs-composable-studio`, `cs-composable-uid`, `hash`) render an empty edit canvas instead of a 404.
   - Any other error is rethrown, so it answers 500 rather than a fake 404.
4. **SSR styles:** `getSSRStyles(spec)` is emitted from the server page, not the client wrapper.
5. **Keep the site chrome off `/canvas`:** `SiteChrome` and Lytics get a pathname gate. A route group can't remove chrome that the root layout renders, and turning the app into multiple root layouts would move every route file.
6. **`next.config` headers for `/canvas` only:** `frame-ancestors 'self' https://*.contentstack.com`.
7. **Leave existing Live Preview alone:** keep `LivePreviewInit` as it is and don't call `ContentstackLivePreview.init` a second time.

---

## 5. Component inventory

The [pack] standing rule is that anything rendering more than one piece of content gets decomposed into atoms, and Sections are composed from atoms. I'm following that, with **one deliberate exception**: components whose value is behaviour (carousel rotation, scroll controls) are registered whole and bound to an array, which [pack] allows "to keep design parity".

### 5a. Registered atoms (one prop maps to one field)

| Type | Wraps | Props (Studio type) |
|---|---|---|
| `flix-heading` | `Heading` | text `string`, level `choice`, size `choice`, tone `choice` |
| `flix-eyebrow` | `Eyebrow` | text `string`, tone `choice` |
| `flix-text` | `Readout`/`p` | text `plaintext` (multi-line) |
| `flix-rich-text` | Studio `RichText` + `registerRTERenderer` | body `json_rte`. For synopsis and bio |
| `flix-image` | `next/image` / `FallbackImage` | src `imageurl` (accepts `string \| {url} \| null`), alt `string`, aspect `choice` |
| `flix-badge` | `Badge` | text `string`, variant `choice` |
| `flix-button-link` | `Button asChild` + link | label `string`, href `href`, variant `choice`, newTab `boolean` |
| `flix-rating-badge` | `RatingBadge` | rating `string` |
| `flix-score` | `Score` | value `number`, size `choice` |

### 5b. Registered layout primitives (slots)

The first three are **new design-system primitives**, so each needs a `/design-system` specimen.

| Type | Wraps | Props |
|---|---|---|
| `flix-stack` | new `Stack` | children `slot`, gap `choice`, align `choice` |
| `flix-row` | new `Row` | children `slot`, gap `choice`, justify `choice`, wrap `boolean` |
| `flix-grid` | new `Grid` | children `slot`, columns `choice` |
| `flix-section-shell` | `PageShell` + vertical padding | children `slot`, width `choice`, padding `choice` |
| `flix-panel` | `Panel` | children `slot`, padding `choice`, scanlines `boolean` |

### 5c. Behaviour composites (the deliberate exception)

| Type | Wraps | Bound to |
|---|---|---|
| `flix-hero-carousel` | `Hero` | `banners` `array` of `hero_banner` (resolve references) |
| `flix-title-rail` | `Rail` | title `string` + items `array` of `movie \| tv_series` (resolve references) |
| `flix-title-grid` | `TitleGrid` | items `array`, columns `choice` |
| `flix-title-card` | `TitleCard` | a single `movie \| tv_series` reference, layout `choice` |

The adapters turn raw CDA values into the design system's normalized types by reusing the existing `normalize*` helpers. Phase 3 confirms those helpers are client-safe.

### 5d. Not registered (app state or site chrome)

- **App state:** `FilterBar`, `SearchField`, `Switch`, `SegmentedControl`, `PreferencesPanel`, `EpisodeList` (it takes `onPlay`), `ProfileCard`, `VideoPlayer` (deferred), `ThemeToggle`, `ReduceEffects*`, `CarouselControls`/`Dots` (these are internals of the composites).
- **Header, footer and nav:** [pack] says shared shells should be Sections. **I'm deviating on purpose.** Header and footer are rendered by the root layout from their singleton entries, so Studio pages already get them, and making them Sections as well would render them twice. If you ever want Studio to own the chrome, that's a separate migration.

### 5e. Breakpoints and tokens

- **Breakpoints:** `registerBreakpoints` with `default` (1440), `tablet` (`max-width: 1023px`) and `mobile` (`max-width: 767px`). These are aligned to the Tailwind breakpoints the components already use.
- **Design tokens** (`registerDesignTokens`): deferred to phase 9 with Freeform (D5). It needs the Freeform flag, and it must be called with `allowedValuesLevel:"tokens"`; leaving the option out locks every control.

---

## 6. Content model: `landing_page` (D2)

Created through the claude.ai Contentstack connector (`create_a_content_type`):

| Field | Type | Notes |
|---|---|---|
| `title` | text, mandatory | |
| `url` | URL, prefix `/collections/` | Template URL `/collections/{{entry.slug}}` |
| `slug` | text, unique | |
| `seo` | global field `seo` | Fed to `generateMetadata` |
| `hero_banners` | reference → `hero_banner`, multiple | Hero Carousel section |
| `callouts` | group, multiple: icon, heading, body | Feature Callouts section (Repeater). This replaces the hardcoded array on `/` for Studio pages only |
| `featured_title` | reference → `movie`, `tv_series`, single | Title Spotlight section |
| `rails` | reference → `homepage_rail`, multiple | Title Rail section (Repeater + Condition) |
| `promo` | group: eyebrow, headline, body, image, cta (global field `cta`), layout | Promo section, built from atoms |
| `genre` | reference → `genre`, single | Genre Spotlight section |

Seed: one entry, **"Halloween Horror Picks"**, referencing existing hero banners, rails and the horror genre, published to `development` only.

---

## 7. Sections and templates

### Sections (compositions with `place_composition_as: "section"`)

| Section | Linked schema | Built from |
|---|---|---|
| **Hero Carousel** | `landing_page.hero_banners` | `flix-hero-carousel` |
| **Feature Callouts** | `landing_page.callouts` (Repeater) | `flix-section-shell` › `flix-grid` › repeated `flix-panel` › `flix-stack`(`flix-heading`, `flix-text`) |
| **Title Spotlight** | `landing_page.featured_title` | `flix-section-shell` › `flix-row`(`flix-image`, `flix-stack`(`flix-eyebrow`, `flix-heading`, `flix-row`(`flix-rating-badge`, `flix-score`), `flix-rich-text`, `flix-button-link`)) |
| **Title Rail** | `landing_page.rails` (Repeater + Condition) | `flix-title-rail` |
| **Promo** | `landing_page.promo` | `flix-section-shell` › `flix-panel` › `flix-row`(`flix-image`, `flix-stack`(`flix-eyebrow`, `flix-heading`, `flix-text`, `flix-button-link`)). The image-left/right layout is an exposed prop, so it's one Section rather than two. Built this way it also fixes the hand-styled promo CTA follow-up in `docs/design-system-plan.md` |
| **Genre Spotlight** | `landing_page.genre` | `flix-section-shell` › `flix-stack`(`flix-heading`, `flix-text`, `flix-title-grid`) |
| **Open Section** | none | `flix-section-shell` › `flix-stack`(`flix-heading`, **Section Slot**). Lets authors drop any atom or composite in |

Each Section gets a `ui_preview` thumbnail when it's created. The CMA never sets one [pack].

### Templates

- **T1 Collection page.** Connected to `landing_page`, URL `/collections/{{entry.slug}}`. Stack: Hero Carousel → Feature Callouts → Title Spotlight → Title Rail(s) → Promo → Genre Spotlight. That's 6 section nodes, checked after the build (DoD #8).
- **T2 Campaign page** (phase 9, Freeform). One URL, `/campaigns/halloween`. A Pinned Query (horror movies) feeds `flix-title-grid`, plus a pinned hero banner and a Promo with static values.

---

## 8. Phases

Each phase ends with a check-in. Every stack write is listed before it runs.

**Phase 0: Preflight (read-only and local).**
- Read the stack Live Preview settings and the preview-token scope, and check whether any **Custom Preview URL** is set on content types. Studio takes the Custom Preview URL before the template pattern [docs], and these can't be read by API, so I'll ask you to check in the UI.
- Read the Next 16 docs for dynamic params and catch-alls, and check whether `force-dynamic` still applies.
- Run the Delivery SDK 5.x spike locally (see §3).
- If D1 goes the API route, list existing Studio projects. Otherwise you confirm none exists for this stack.

> **Phase 0 results (2026-10-22):**
> - **Project:** "Flix Studio", created in the UI. It made the `compositions` content type with the full 13-field schema (`linked_schemas` multiple, `linked_sections` a self-reference).
> - **Delivery SDK:** the spike with `studio-react@2.0.1` and `delivery-sdk@5.5.2` passed. Studio installs no Delivery SDK of its own; `fetchCompositionData` queried `compositions` on `development` and threw `NO_COMPOSITION_FOR_URL`, and `isCompositionNotFound()` returned true. **No 4.x fallback is needed.**
> - **Next 16:** `params`/`searchParams` are still Promises, and `cacheComponents` is off. The Studio guide's route pattern applies as written.
> - **Normalizer:** `normalize.ts` is client-safe; it imports only `@contentstack/utils` and the client config.
> - **Local HTTPS:** mkcert isn't installed. Use `next dev --experimental-https` instead (Next generates the certificate) through a new `dev:studio` script.
> - **Still open:** Custom Preview URLs (UI check).

**Phase 1: Provision.** These are stack writes.
- Create the Studio project (D1). Name it "FlixStack". Content type `compositions`, on stack `blt2714f2503dfc1b5f`.
- Configure it: Environment (`studio-local` or `development`, per D4), Language `en-us`, Canvas URL `/canvas`, Freeform off.
- (D4) Create the `studio-local` environment, add it to the delivery and preview token scope, and enable Live Preview for it.
- Read the project and content type back to verify.

**Phase 2: SDK and routes** (code only).
- Install `@contentstack/studio-react@2.0.1` with `--save-exact`, using npm because Launch uses npm.
- Add `lib/studio/sdk.ts`, `studio-init.tsx`, `/canvas`, `collections/[slug]`, the chrome/Lytics pathname gate and the `/canvas` headers.
- Add `NEXT_PUBLIC_CONTENTSTACK_STUDIO_CONTENT_TYPE` to `.env.local.example`.
- **Check:** the canvas loads empty in Studio, `/collections/nope` returns the app's 404 (not a 500), and existing routes are unchanged (snapshot parity).

> **Phase 2 notes (2026-10-22, branch `feat/studio`):**
> - **`studioSdk.init` is a per-process singleton,** and Studio only ever *sets* a live-preview hash on its stack. So the **server-side Studio instance is published-only.** Studio editor requests (`isStudioEditorMode`) and `live_preview` requests render in the browser via `useCompositionData`, so a draft hash can't leak into visitor renders.
> - **The browser instance is also published-only for now,** because the preview token is server-only by repo rule. Showing drafts on the canvas would need a browser-visible preview token on `development` only. That's an open decision.
> - **Keeping the canvas clean:** chrome, Live Preview and Lytics stand down on `/canvas` via pathname checks (`studio/canvas-path.ts`). The [pack]'s route-group advice doesn't apply, because a route group can't escape chrome rendered by the root layout.
> - **Verified on a production build:**
>   - `/canvas` returns 200 with the `frame-ancestors` CSP header, and only there.
>   - `/collections/<missing>` returns the app's 404.
>   - Editor-mode and `live_preview` requests return 200 and render in the browser.
>   - Existing routes and the static/dynamic split are unchanged.

**Phase 3: Design system and registration** (code only).
- Add the `Stack`, `Row` and `Grid` primitives with specimens.
- Add the 18 adapters, their thumbnails and the breakpoints.
- **Check:**
  - Lint, `check-contrast`, `a11y` and snapshot parity pass.
  - The audit counts agree: the number of `registerComponent` entries equals the number of `wrap:false` and the number of `studioAttributes` spreads.
  - Every component appears in the Studio palette with a thumbnail.

> **Phase 3 notes (2026-10-28):**
> - **New design-system primitives:** `Stack`, `Row` and `Grid` share one gap scale (`gapClasses`), each with a `/design-system` specimen. `RatingBadge` and `Score` now pass HTML attributes through (a non-visual change), so edit tags can land on them.
> - **Registration:** 18 components in `src/studio/register.ts`, with `strict: true` and breakpoints of 1440 / 1023 / 767.
>   - The adapters live in `src/studio/components/{atoms,layout,composites}.tsx`; thumbnails are in `src/studio/thumbnails.ts`.
>   - Audit: 18 registrations, 18 `wrap: false`, 18 thumbnails, and every adapter spreads `studioAttributes`.
> - **Differences from §5:**
>   - `flix-text` renders its own `<p>` rather than `Readout`.
>   - `flix-title-card` takes an `array` prop, because the Delivery API returns even a single reference as an array.
>   - Components are eager, not lazy, because they wrap design-system code the app already ships.
> - **For Phase 6:** a template URL of `/collections/{{entry.slug}}` only resolves with a pattern URL source (`user_specified_pattern`). With `content_type_url_pattern`, only `{{entry.url}}` resolves.
> - **Checks:**
>   - typecheck, lint, build and contrast (80/80) pass;
>   - axe is clean except the known light-mode `Score size="hero"` contrast follow-up (`docs/design-system-plan.md`). `flix-score` inherits it on artwork.
>   - In headless Chrome the registrations run without throwing. Outside Studio the only messages are the expected "no Studio parent frame" ones.

**Phase 4: Content model.** These are stack writes.
- Create the `landing_page` content type.
- Create the seed entry and publish it to `development` (and `studio-local`).

> **Phase 4 results (2026-10-28):**
> - **`landing_page` created** with `url_prefix` `/collections/`. The `callouts` group has heading and body only (no icon, since no registered component renders one). `SYS_ACL.roles` came back empty, unlike `page`; role access is to be decided by the stack owner.
> - **Seed entry `bltf35647e0617bc310`, "Halloween Thrills"** (`/collections/halloween-thrills`). The stack has no Horror genre, so it uses Thriller.
>   - Featured title: *Get Out*, the one title tagged `horror`.
>   - Hero banners: Oppenheimer and "Find your next favorite".
>   - Rails: Award Winners and Trending Now. The promo uses the John Wick hero image.
> - **Published to `development` through the CMA with the management token.** The claude.ai connector's `publish_an_entry` returned 422 "valid parameter for environments" for every format tried.
> - **Verified on the CDN:** all references resolve, including `rails.items` two levels deep.

**Phase 5: Sections.** Stack writes (D3).
- Create the 7 Sections, each with its `ui_preview`.
- Check each one in Preview Mode with real data, not defaults.

> **Phase 5 results (2026-10-28):**
> - **Seven sections written and published to `development`** by `scripts/studio/seed-compositions.ts` (`npm run studio:seed`).
>   - The script is idempotent, matching on `composable_uid`. Each tree passes preflight before writing and again on read-back.
>   - Every registered prop is written, with choice values as lists.
>   - Each section's `ui_preview` is a generated SVG schematic (labelled as one). Saving a section in Studio replaces it with a screenshot.
>
>   | Section | `composable_uid` | Entry | Scope |
>   |---|---|---|---|
>   | Hero Carousel | `flix_hero_carousel` | `bltb7be3919a156b9b6` | `hero_banners` |
>   | Feature Callouts | `flix_feature_callouts` | `blt9a442509c9f2e0ad` | `callouts` (collection, Repeater) |
>   | Title Spotlight | `flix_title_spotlight` | `blt6fd27f52662b9a8b` | whole entry, `featured_title.0.*` |
>   | Title Rails | `flix_title_rails` | `blt0a7a9b78d91e0473` | `rails` (Repeater + Condition) |
>   | Promo | `flix_promo` | `blt42649c6849b8b98a` | `promo`; exposes "Image on the right" |
>   | Genre Spotlight | `flix_genre_spotlight` | `blt6dd7a181df9260ec` | whole entry, `genre.0.*` |
>   | Open Section | `flix_open_section` | `blt88df32f0168bfb0f` | none; contains a Section Slot |
> - **Differences from §7:**
>   - Genre Spotlight has no title grid. Genre entries don't reference their titles, so a grid needs a pinned query (Freeform, deferred).
>   - Title Spotlight and Genre Spotlight use whole-entry scope, because a section's `selected_field` can't index into a single reference's one-item array.
> - **Prop schemas moved** to `src/studio/schemas.ts` (pure data), shared by `register.ts` and the seed script.
> - **Not yet verified:** rendering. Sections only get data when placed on a template, so the render check happens in Phase 6.

**Phase 6: Templates.** Stack writes. Use `url_source: content_type_url_pattern` rather than `user_specified_pattern`: `landing_page` has a URL pattern and its entries store a real `url`, so this is the guide's recommended source. The template's `data_sources.resolvedReferences` must cover `hero_banners`, `hero_banners.linked_title`, `featured_title`, `rails`, `rails.items` and `genre`.
- Create T1, then confirm the section-node count and `linked_sections`.
- Open it in Studio with the seed entry and edit a field inline (Visual Editor tags).

> **Phase 6 results (2026-10-28):**
> - **Template "Collection page"** (`flix_collection_page`, entry `blt61fc25cbe536dadd`), published to `development`.
>   - Connected to `landing_page`, URL `/collections/{{entry.title}}` with `url_source: content_type_url_pattern`.
>   - Six section placements, matching six `linked_sections`. Promo's "Image on the right" is set to false.
>   - `resolvedReferences`: `hero_banners`, `hero_banners.linked_title`, `featured_title`, `rails`, `rails.items`, `genre`.
> - **Verified locally on a production build:**
>   - The SDK resolves every section's scoped data, including `rails.items` two levels deep.
>   - `/collections/halloween-thrills` returns 200 with all six sections. Desktop and mobile screenshots match the design (rows stack and the grid collapses on mobile).
>   - A slug with no entry returns 404. Editor-mode requests render in the browser.
>   - The editor path (`include[]=linked_sections`) resolves the same six sections.
> - **Change:** the route reads title and description from the entry's `seo` via `getLandingPageMeta`. Studio only fetches bound fields, so the template's name was showing as the title.
> - **Existing follow-up, not introduced here:** an SEO title that already ends "— Flixstack" gets "| Flixstack" appended by the root title template. `/browse` does the same.
> - **Still to verify in Studio after the deploy:** the palette, the canvas, opening the template, and a real-screenshot section thumbnail (Save).

**Phase 7: Definition of done, all 10 items from [pack] `complete-the-build`:**
1. `appendTags`
2. `studioAttributes` + `wrap:false` + `$` twins
3. thumbnails
4. `ui_preview`
5. Live Preview + preview token
6. `/canvas`
7. published, with non-empty `publish_details`
8. templates composed of Sections
9. `mode:"builder"`
10. new entries editable

Then run `verify-setup` layers 0–7, each recorded as passed, failed or unverified.

> **Phase 7 results (2026-10-29), definition-of-done audit:**
>
> | # | Item | Status |
> |---|---|---|
> | 1 | `cslp.appendTags` | ✅ in `src/lib/studio/sdk.ts` |
> | 2 | `studioAttributes` + `wrap:false` + `$` twins | ✅ all 18 adapters |
> | 3 | `thumbnailUrl` | ✅ all 18 |
> | 4 | `ui_preview` | ✅ all 7 sections (generated schematics; Save in Studio for screenshots) |
> | 5 | Live Preview + preview token | ⚠️ Live Preview is on for `development`, but the deployed development bundle doesn't contain `NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN` (checked 2026-10-29). Studio shows published content until it's set and redeployed |
> | 6 | `/canvas` | ✅ live on development: 200, CSP, no chrome |
> | 7 | Published | ✅ 7 sections + template, with `publish_details` on development |
> | 8 | Template composed of Sections | ✅ 6 section nodes = 6 `linked_sections` |
> | 9 | Live Preview `mode:"builder"` | ✅ `LivePreviewInit` |
> | 10 | New entries editable | ⏳ to confirm in Studio (Visual Editor on a new Landing Page) |
>
> **Also fixed:** composite placeholders ("Bind … to show content here") now render only inside Studio (`isStudioCanvas()`), never for visitors.

> **Phase 8 results (2026-10-29):**
> - **Deploy:** #18, #20 (Studio, re-opened against `main` after #19 merged into `feat/design-system` by mistake) and #21 are merged, and both Launch sites rebuilt from `main`.
> - **Development:** `/canvas` 200 with CSP, `/collections/halloween-thrills` 200 with the right title, unknown slugs 404, existing routes 200. The live page matches the local screenshot, with no console errors.
> - **Production:** `/canvas` 200 (inert outside Studio), `/collections/*` 404, as intended.
> - **Docs:** `docs/studio.md`, a how-to for editors and developers.

**Phase 8: Deploy to Launch development.**
- Set the new environment variable on **the Launch development environment**. Launch environments don't share variables, which is what broke production last time.
- Switch the Studio project to the `development` environment.
- Publish the compositions to `development`.
- Check with curl and in Studio.
- Write `docs/studio.md`, a short how-to for editors and developers.

**Phase 9 (optional, later):**
- Freeform plus T2 Campaign.
- Register design tokens, with a curated subset of `tokens.css` (brand colours and the spacing scale) at the `tokens` level.
- `VideoPlayer` as a component.
- Production go-live, which needs an approver to move compositions through Editorial Review.

---

## 9. Risks and open questions

1. **Delivery SDK 5.x vs 4.x.** The spike decides; the fallback is the version-4 alias (§3).
2. **Custom Preview URLs** on any content type would override Studio template URLs [docs]. The Phase 0 UI check covers this.
3. **Reference resolution depth.** Rails go landing_page → homepage_rail → movie/tv_series, which is two levels. Studio needs "Resolve reference" on each binding [docs/data].
4. **Normalizer reuse on the client.** If `normalize.ts` imports server-only code, the adapters get a small client-safe subset instead.
5. **Workflow gating.** If the Editorial Review workflow's scope includes new content types, composition deploys to `development` stay ungated, but production does not. That's out of scope here.
6. **Auth.**
   - The claude.ai connector covers every CMA step.
   - The Studio API (only needed for D1 by API, or for listing projects or registered components) needs OAuth. I'd ask before touching `~/Library/Application Support/ContentstackMCP/oauth-config.json`, or use `csdx login --oauth`.
   - The local `contentstack` MCP server is currently failing to connect. Nothing in this plan depends on it.
7. **Docs and skill-pack inconsistencies to watch:**
   - The canvas dynamic-import snippet breaks prod builds, so use a local wrapper.
   - The DoD is listed as 8 items in one place and 10 in another; I'm using all 10.
   - `registerDesignTokens` timing, and `registerJSONRTE` vs `registerRTERenderer` (using `registerRTERenderer`).

## 10. Out of scope

- Moving existing routes (`/`, `/movie`, `/tv-show`, `/browse`, `/watch`, `/genre`) to Studio. Doing it page by page later is the [pack] `migrate-page-to-studio` path.
- Studio-owned header and footer.
- Production publishing.
- Personalize variants in Studio.
