# Design system & component library

> **Status:** plan approved. All four open decisions are settled. See
> [Decisions (resolved)](#decisions-resolved).
> **Branch:** all work lands on `feat/design-system`. Nothing is committed to `main` directly.

## Goal

Turn Flixstack's existing visual system into an organised component library: one shared
component for each pattern, documented on an in-app catalog page, with pages assembled from it.
This is a **strict-parity refactor**. No page changes how it looks or behaves. Any design change
spotted along the way goes on the [follow-up list](#follow-ups-not-in-this-work) and is not
made here.

## Context

### What already exists

The **foundation** is in good shape, after the [cyber redesign](./cyber-redesign-plan.md):

- [globals.css](../src/app/globals.css) has a full token set: light and dark palettes, four
  colour hues (accent / info / signal / premium), a shape scale, texture and glow tokens behind
  the `.reduce-fx` switch, and support for forced colours, `prefers-contrast` and reduced motion.
- Every colour pair is checked for contrast by `npm run check-contrast`
  ([check-contrast.mjs](../scripts/check-contrast.mjs)), and every route is scanned with axe by
  `npm run a11y` ([a11y.mjs](../scripts/a11y.mjs)).
- The accessibility rules that keep this working are written up in [accessibility.md](./accessibility.md)
  and in comments throughout globals.css.

The **component library** is what's missing. There are three shared components
([Button](../src/components/ui/button.tsx), [Badge](../src/components/ui/badge.tsx),
[Skeleton](../src/components/ui/skeleton.tsx)) plus a handful of streaming and layout components.
Everything else is written out by hand inside page files, and much of it is duplicated:

| Pattern | Today |
|---|---|
| Notched icon button | 10 hand-written copies in 6 files (hero, rail, title-card, header, footer, setup) |
| On/off switch | Built twice: [profile-client.tsx:164](../src/app/profile/profile-client.tsx#L164) and [reduce-effects-toggle.tsx:84](../src/components/layout/reduce-effects-toggle.tsx#L84) |
| Toggle chips and segmented radio buttons | Hand-built in [browse-client.tsx](../src/app/browse/browse-client.tsx) and profile |
| Small mono uppercase label | The same class string in 43 places |
| Page side padding (`px-4 sm:px-6 lg:px-8`) | 19 places across 14 files |
| Headings in the display font | 8 different text sizes; no defined type scale |
| White text and overlays on artwork (`white/70`, `black/65`, `[#05070A]`, …) | About 20 raw values in hero, title-card, watch-content and genre, outside the token system |
| Large page files | [watch-content.tsx](../src/app/watch/[slug]/watch-content.tsx) is 465 lines, profile-client 274, browse-client 199, each with sub-components built inline |
| `"use client"` | 17 files, several only for one small piece of state (`TitleCard` only tracks a broken image) |

So most of this work is extraction and consolidation, not new design.

---

## Structure

```
src/design-system/
  tokens/       tokens.css · effects.css · a11y.css      (split out of globals.css)
  primitives/   the smallest pieces — no app data          (atomic level: atoms)
  patterns/     small combinations of primitives — no app data   (molecules)
  sections/     larger page sections — may use Flixstack's content types   (organisms)
  templates/    page layouts: grid and spacing, no data fetching   (templates)
  index.ts
src/app/**      pages: fetch data → choose a template → pass props
src/app/design-system/   the catalog page (see Phase 1)
```

Imports use the existing alias: `import { Button, Rail } from "@/design-system"`.
The atomic-design names (atoms, molecules, organisms) are kept only as labels on the catalog page,
so people who know the method can find their way around.

### Rules every component follows

1. **Only sections know about Contentstack.** Primitives and patterns take plain props (strings,
   numbers, links, children). Sections such as `TitleCard`, `Hero` and `PromoBlock` can take
   `Movie`, `HeroBanner` and other types from [types.ts](../src/lib/types.ts).
2. **Live Preview edit tags are always passed through.** Any component that shows CMS text takes
   an `editable` prop (a `CslpTag`) and spreads it onto the element that holds the text. Losing a
   tag silently breaks click-to-edit, so Phase 1 adds an automated check for it.
3. **Server components by default.** `"use client"` goes only on the smallest piece that actually
   needs state or browser APIs (`Switch`, `CarouselControls`, the image fallback inside
   `TitleCard`), never on a whole section.
4. **React 19 conventions.** Pass `ref` as a normal prop instead of using `forwardRef`. Variants
   stay as typed lookup maps combined with `cn()`, so no new dependency. `asChild` keeps its
   current `cloneElement` approach.
5. **Existing accessibility rules are built into the components, not left for each page to
   remember:**
   - Notched shapes get their focus ring as an inset `box-shadow`, because `clip-path` would cut
     off an outline.
   - Global CSS classes never set `position`: unlayered CSS overrides Tailwind, which has already
     caused two bugs.
   - No opacity, glow or shadow is hardcoded. Every one reads a token that `.reduce-fx` can switch
     off.
   - Glow is never applied to anything focusable.
   - Text on artwork uses the on-media tokens and sits on the fixed dark scrim.
   - The active state is never shown by colour alone.

---

## Component inventory

★ = new, or extracted from a page. Everything else exists today and moves or is refactored.

| Level | Components |
|---|---|
| **Tokens** | Colour, shape and effects (already exist) · ★ **type scale** · ★ **layout** (container width, page side padding, section spacing) · ★ **on-media** (text, borders and overlays on artwork) · ★ **motion** (durations) and **z-index** |
| **Primitives** | Button · Badge · Skeleton · ★IconButton · ★Switch · ★ToggleChip · ★Input · ★Select · ★Heading · ★Eyebrow (the mono label) · ★TextLink · ★Logo · ★Spinner · ★VisuallyHidden |
| **Patterns** | NavLink · ★SectionHeader (`//` mark + heading + optional action such as "View all →") · ★SegmentedControl (radio group) · ★SearchField · ★MetaReadout (year · runtime · score) · ★RatingBadge (replaces `getRatingColor`) · ★SettingRow (icon + label + description + switch) · ★CarouselControls · ★CarouselDots · ★EmptyState · ★FeatureCard |
| **Sections** | TitleCard · Rail · Hero · Header · Nav · Footer · VideoPlayer · ★TitleGrid · ★PromoBlock · ★GenreSpotlight · ★TitleDetailHeader · ★EpisodeList · ★CreditsList · ★FilterBar · ★ProfileCard · ★PreferencesPanel · ★SetupStepList |
| **Templates** | ★PageShell · ★ListingTemplate (shared by browse, genre and search) · ★DetailTemplate (watch page) · ★ModularPageTemplate (wraps [modular-block-renderer.tsx](../src/components/cms/modular-block-renderer.tsx)) |

On the catalog page, each section that renders a Contentstack modular block names the block it
belongs to (`hero_block` → `Hero`, `promo_block` → `PromoBlock`, and so on), so content editors
can see what each block looks like.

### Type scale under strict parity

The type scale tokens map **one-to-one onto the 8 sizes in use today**. Nothing is merged or
resized. Merging them into a smaller scale is a visual change, so it is on the follow-up list.

---

## Phases

Each phase is one PR targeting `feat/design-system`, which merges to `main` once the work is
complete. Every PR must pass the **parity gate**:

- `npm run snapshot -- --compare` reports no differences in screenshots, or every difference is
  explained in the PR
- `npm run check-contrast` passes
- `npm run a11y` passes (now including `/design-system`)
- `npm run lint` and `next build` pass

| # | Phase | Output | Size |
|---|---|---|---|
| **0** | Token foundation and parity harness | See below. No component changes. | S |
| **1** | Catalog page | `/design-system` page, token sections, page frame for each component, Live Preview tag check | M |
| **2** | Primitives | Move the 3 existing components and build 11 new ones. Replace every duplicate. | M |
| **3** | Patterns | 11 patterns, with catalog entries, replacing the hand-built versions in pages | M |
| **4** | Sections | Refactor the existing 7 and extract 10 from pages | L |
| **5** | Templates and page cleanup | 4 templates; route files shrink; old folders removed | M |
| **6** | Guardrails and docs | Lint rule, contribution guide, updated accessibility.md | S |

### Phase 0 — Token foundation and parity harness

- **Parity harness, built first.** Add `scripts/snapshot.mjs`, reusing the headless-Chrome code
  from `a11y.mjs`. It screenshots every route in `a11y.mjs`'s `ROUTES` list in every combination
  of light/dark, effects on/off and 1440px/390px widths. `--baseline` saves the reference set and
  `--compare` diffs against it (new dev dependencies: `pixelmatch` + `pngjs`).
  - Animations are stopped by setting reduced motion through Chrome's DevTools protocol.
  - Baseline and comparison are captured one after the other against the same environment, so a
    CMS content change can't look like a regression.
  - The baseline is taken from `main` before any other change.
- **Split globals.css** into `tokens/tokens.css`, `tokens/effects.css` and `tokens/a11y.css`,
  imported in the same order so CSS precedence doesn't change.
  - `check-contrast.mjs` reads the `:root` and `.dark` blocks by parsing the file, so its path is
    updated and its parser checked against the new file.
  - The unlayered utilities stay in one file, in their current order.
- **Add the new tokens**: type scale, layout, on-media, motion, z-index. Each one equals the value
  it replaces, so screenshots don't change.
- **Add the on-media pairs to `check-contrast.mjs`** (for example, white at 70% on the scrim's
  darkest point). These values aren't checked today.

### Phase 1 — The `/design-system` catalog page

- **Route:** `src/app/design-system/page.tsx`, with one section for each level (Tokens,
  Primitives, Patterns, Sections, Templates) and a jump-to table of contents.
- **Hidden in production.** The page calls `notFound()` unless `NODE_ENV !== "production"` or
  `NEXT_PUBLIC_DESIGN_SYSTEM=true`, and sets `robots: { index: false }`. Check the current
  `notFound` and metadata APIs in `node_modules/next/dist/docs/` before writing it (see
  [AGENTS.md](../AGENTS.md)).
- **Theme controls.** A sticky toolbar reuses the site's existing `ThemeToggle` and
  `ReduceEffectsToggle`, so every example responds to the same light/dark and reduce-effects
  switches as the real site.
  - Showing light and dark side by side is out of scope: light tokens live on `:root`, so a
    nested light preview would need a second copy of the token block.
- **`<Specimen>` frame for each component:** a name, its level, a live example in each variant
  and state (default / hover-able / focus-able / disabled / loading), the props table, and the
  modular block it maps to where there is one.
- **Token sections.** Colour swatches with the contrast ratio on each surface, calculated in the
  browser from the CSS variables (same formula as `check-contrast.mjs`), plus the type scale,
  shape scale, spacing and texture effects.
- **Example data** comes from [mock-data.ts](../src/lib/mock-data.ts) with placeholder `$` edit
  tags, so the page renders with no Contentstack connection.
- **Automated checks:**
  - `/design-system` is added to `ROUTES` in `a11y.mjs`, so axe scans every example on every
    run.
  - New assertion in `a11y.mjs`: every example marked `data-specimen-cms` must contain at least
    one `[data-cslp]` element. This catches a component that drops its Live Preview tag.

### Phase 2 — Primitives

Move `Button`, `Badge` and `Skeleton` into `src/design-system/primitives/` and build the 11 new
primitives. Then replace the hand-built versions:

- all 10 notched icon buttons → `IconButton`
- both switches → `Switch`, with the reduce-effects switch keeping its `<html>` +
  localStorage state; only the markup is shared
- the `aria-pressed` genre chips in profile and browse → `ToggleChip`
- the search `<input>` and browse `<select>` → `Input` and `Select`
- the 43 hand-written labels → `Eyebrow`
- the duplicate header and footer logo marks → `Logo`

`Button` drops `forwardRef` (React 19) and loses `"use client"`; it has no state.

### Phase 3 — Patterns

Build the 11 patterns. The biggest wins are `SectionHeader` (rail, genre spotlight, watch, profile,
setup), `MetaReadout` (title card, watch header), `SegmentedControl` (the two browse radio groups)
and `SettingRow` (the three profile preference rows).

### Phase 4 — Sections

- **Refactor** TitleCard, Rail, Hero, Header, Nav, Footer and VideoPlayer onto primitives and
  patterns.
  - `TitleCard` becomes a server component; only the image fallback stays client-side.
- **Extract from pages:**
  - from [watch-content.tsx](../src/app/watch/[slug]/watch-content.tsx): `TitleDetailHeader`,
    `EpisodeList`, `CreditsList`
  - from [profile-client.tsx](../src/app/profile/profile-client.tsx): `ProfileCard`,
    `PreferencesPanel`
  - from [browse-client.tsx](../src/app/browse/browse-client.tsx): `FilterBar`
  - from the block renderer: `PromoBlock`, `GenreSpotlight`
  - from setup: `SetupStepList`
  - `TitleGrid` replaces the four hand-written title grids.
- **Check Live Preview by hand** in the Contentstack preview window for each changed section,
  alongside the automated tag check.

This is the largest PR. If review gets heavy it can be split in two: refactors in one, extractions
in the other.

### Phase 5 — Templates and page cleanup

- Add `PageShell`, `ListingTemplate`, `DetailTemplate` and `ModularPageTemplate`.
- Route files shrink to fetching data and choosing a template.
- Delete `src/components/ui/` and `src/components/streaming/`.
  - `src/components/layout/` keeps only the app-wiring files (`providers`, `site-chrome`).
  - `analytics/` and `contentstack/` stay where they are; they aren't UI.

### Phase 6 — Guardrails and docs

- **Lint check** (an ESLint `no-restricted-syntax` rule on `className` strings, or a small script
  wired into `npm run lint`). It fails on:
  - raw palette colours (`red-600` and similar)
  - `white/NN` and `black/NN` outside on-media tokens
  - hex values in square brackets
  - `bg-[var(--…)]` (use the v4 shorthand `bg-(--…)` instead)
- **`src/design-system/README.md`:** the structure, the rules above, how to add a component (the
  catalog page entry is required), and the parity gate.
- **Update [accessibility.md](./accessibility.md)** to point to components instead of class
  names, and add the new checks to its "Audit tools" section.

---

<a id="decisions-resolved"></a>

## Decisions (resolved)

| # | Question | Decision | What it means for this plan |
|---|---|---|---|
| **D1** | Where the component catalog lives | ✅ **A `/design-system` page in the app** | No Storybook and no new catalog dependencies. The existing axe run covers it, a placeholder-tag assertion replaces per-story checks, and the page is hidden in production. |
| **D2** | Allow visual changes? | ✅ **Strict parity** | Screenshot harness built in Phase 0 and required on every PR. The type scale keeps all 8 current sizes. Design changes go on the follow-up list. |
| **D3** | Library location | ✅ **Inside the app** at `src/design-system/` | Uses the existing `@/` alias; no workspace or package publishing |
| **D4** | Folder names | ✅ **`primitives/patterns/sections`** (+ `templates/`) | Atomic-design names appear only as labels on the catalog page |

## Risks

| Risk | Mitigation |
|---|---|
| Live Preview edit tags dropped during extraction | The `editable` prop rule, the `data-specimen-cms` → `[data-cslp]` check in `a11y.mjs`, and a manual check in the preview window during Phase 4 |
| Focus rings on notched shapes break when classes move (they depend on CSS order and `:has()`) | The notch and focus classes stay in globals.css unchanged; axe runs on every example; keyboard check on every notched component |
| Splitting globals.css changes CSS precedence (unlayered CSS overrides Tailwind; it has already caused the sticky-header and hero-scrim bugs) | Files imported in the original order; unlayered utilities kept together; any precedence change shows up in the Phase 0 screenshots |
| False alarms from the screenshot harness (carousel rotation, live CMS edits) | Reduced motion forced in Chrome; baseline and comparison captured back to back; differences reviewed by eye, never auto-accepted |
| `check-contrast.mjs` reads tokens by text-matching | Updated in the same PR that moves the tokens; a "found N tokens" count asserted so a silent parse failure can't pass |
| The `/design-system` page reachable in production | `notFound()` behind an env check, plus `noindex`; checked in a production build before Phase 1 merges |
| Moving `"use client"` changes data flow (functions can't be passed as props into server components) | Client code moves only to the smallest pieces; `next build` is part of the gate |

## What changed during implementation

The plan was followed, with these adjustments. Each was made because the original idea didn't
fit the code once I was in it.

| Planned | Built | Why |
|---|---|---|
| Three token files | **Four:** `tokens.css`, `effects.css`, `a11y.css`, `preview.css` | The Live Preview inspector rules come last in the original file. Splitting them out keeps the CSS order byte-for-byte, which a diff check confirmed |
| Type scale, motion and z-index as CSS tokens | **Type scale as `Heading`'s size map; motion and z-index dropped** | Tailwind already defines the type sizes, so new CSS variables would duplicate them. Under strict parity, nothing would have used motion or z-index tokens |
| Layout tokens | **Class strings in `tokens/layout.ts`** | The gutter is responsive, so one custom property can't express it. Class strings also stay overridable through `cn()` |
| `Input`, `VisuallyHidden` primitives | **Dropped** | `SearchField` is the only text input; Tailwind's `sr-only` already covers visually-hidden text |
| — | **Added `IconTile`, `Panel`, `FallbackImage`, `SlashMarker`** | `Panel` replaced 12 hand-written notched containers. `FallbackImage` lets `TitleCard` be a server component |
| `MetaReadout`, `FeatureCard` | **`Score` + `Readout`, `LinkCard`** | The two metadata rows shared only the score. The "feature card" is really a whole-card link used in two layouts |
| `CreditsList` | **`CreditsPanel` + `TitleFactsPanel`**; also **`GenreBanner`** | The watch sidebar has two distinct panels. The genre header was the last artwork header built inline |
| `ListingTemplate` | **Dropped** | Browse, genre and search share only the page container, which `PageShell` already covers. A shared template would have needed per-page spacing options just to keep parity |
| Catalog page uses `mock-data.ts` | **Uses live Contentstack data** | The app never falls back to mock data. `mock-data.ts` uses picsum URLs, which `next/image` rejects |
| Edit-tag check on every catalog example | **Runs only when Live Preview is on** | Edit tags exist only when `NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW=true` |
| Screenshot harness | **Added a fresh Chrome profile and disabled cache** | With a warm cache, Chrome picked different `srcset` images between runs, so an unchanged build showed 8 false differences |
| — | **`profile-client.tsx` deleted** | Its only state was the preferences form, now inside `PreferencesPanel`, so `/profile` is a server page |

## Follow-ups (not in this work)

Strict parity kept all of these out. Several were found during the refactor.

- **Score on artwork fails contrast in light mode (WCAG 1.4.3). Highest priority.**
  `Score size="hero"` uses `text-accent`, a theme token. In light mode that is `#0e7038`,
  which on the fixed dark scrim of the watch-page header is **3.25:1**. axe can't see this on
  `/watch/*` because it can't compute contrast over a background image. The `/design-system`
  example shows the same component on the plain media ground, where axe flags it. That is why
  `npm run a11y` reports one violation on `/design-system` (light). Likely fix: an on-media
  accent token (the dark-mode accent, `#3dff9e`, is fixed in both themes) used for on-artwork
  accents. It changes the watch page in light mode only.
- **Hover contrast on the `media` button.** The hero's "More Info" and the watch page's
  "Watchlist" inherit `hover:text-(--color-bg-base)` from their old `secondary` + overrides
  setup. On hover the label turns near-black over a translucent white fill. Hover states need
  a contrast review.
- **Hero carousel can't be paused from the keyboard.** It rotates every 6s and pauses only on
  mouse hover. `prefers-reduced-motion` doesn't stop it either, despite the code comment.
  This is a likely WCAG 2.2.2 (Pause, Stop, Hide) issue.
- **`SegmentedControl` has no arrow-key navigation.** It uses `role="radiogroup"` but each
  option is a separate Tab stop. The ARIA radio pattern expects arrow keys with roving
  `tabindex`.
- **The promo CTA is hand-styled.** Converting it to `<Button>` adds a 1px border (2px
  taller).
- **`/movie` and `/tv-show` titles** use the body font at `text-3xl font-bold`, unlike
  every other page title (`Heading`).
- **Merge the 8 display heading sizes** into a smaller scale.
- **`mock-data.ts` is stale.** It uses picsum URLs and isn't type-aligned. Only the seed
  scripts read it.
- **`VideoPlayer`** creates a `ref` it never uses.
- **A real watchlist.** The `+` button stays a placeholder.

## Out of scope

- Storybook
- Publishing the library as an npm package
- Showing light and dark side by side
- Driving design tokens from Contentstack's brand kit
- Content model changes
- New routes other than `/design-system`
- Replacing `lucide-react`
