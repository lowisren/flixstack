# CMS-driven, landscape Browse page

## Context

`/browse` ([src/app/browse/page.tsx](../src/app/browse/page.tsx)) fetches all titles + genres
and hands them to [browse-client.tsx](../src/app/browse/browse-client.tsx), a fully hardcoded
client component: a static `<h1>`, genre pills, type/tier filters, a sort dropdown, and a
**portrait** grid of `TitleCard`s. **Nothing on this page comes from Contentstack** — unlike
`/`, `/movie`, and `/tv-show`, which are CMS-composed `page` entries.

**Goal:** back `/browse` with a Contentstack `page` entry so editors can add content sections
(hero, CTA/promo) above the grid, switch the cards from portrait to **landscape**, and keep the
existing filter/sort behaviour working exactly as it does today.

### What already exists (and works in our favour)

- The `page` content type already supports the section blocks we need: `hero_block`,
  `rail_block`, `promo_block` (with a `cta` global field), and `genre_spotlight_block`. It drives
  `/`, `/movie`, `/tv-show` via [getPageBySlug()](../src/lib/contentstack/queries.ts#L297) +
  [ModularBlockRenderer](../src/components/cms/modular-block-renderer.tsx).
- [TitleCard](../src/components/streaming/title-card.tsx) already supports `layout="landscape"`
  (280px, `aspect-video`) — browse just passes `"portrait"`.

### Gaps found (the real work)

The `page` pipeline is only half-wired for anything but rails:

1. [getPageBySlug()](../src/lib/contentstack/queries.ts#L297) **only resolves `rail_block`** — it
   explicitly skips hero/promo/genre_spotlight. An editor adding a Hero or Promo/CTA today renders
   nothing.
2. `ModularBlockRenderer`'s `hero_block` case treats `block.data` as a single banner, but the
   schema field is `hero_banners` (an **array** of references).
3. `promo_block` in the schema uses a `cta` **global field** (`label`/`url`), but the `PromoBlock`
   type and renderer read flat `cta_label`/`cta_url`. No `normalizePromoBlock` exists.
4. `normalizePageMeta` drops the page's `seo` global field, so we can't drive real metadata.
5. There is **no** `page` entry with slug `browse` yet (only `homepage`, `movie`, `tv-show`).

## Approach

Make `/browse` a **hybrid page**: CMS-authored sections (hero, CTA/promo) render at the top via the
existing modular-block system, and the interactive **filter/sort + landscape grid** stays as a
fixed, code-owned region below them. Filters and sort remain 100% client-side and unchanged in
behaviour.

### Open decision (needs sign-off)

**How sections compose with the grid.**

- **Recommended:** keep the title grid as a fixed part of the route, with CMS sections rendered
  above it. Simplest, ships fast.
- **Alternative (deferred):** add a new `title_grid_block` so editors can position the grid
  anywhere among the sections. More flexible, but requires a content-type schema change.

## Phased plan

### Phase 1 — Content model & data (Contentstack + queries)

- Create a `page` entry: title "Browse", slug `browse`, url `/browse`, with a starter Hero section
  and a Promo/CTA section so editors see the pattern.
- Extend `getPageBySlug` to resolve `hero_block` (`sections.hero_block.hero_banners` +
  `.linked_title`) and `promo_block` (`sections.promo_block.image`, flatten `cta`).
- Add `normalizePromoBlock`; capture `seo` in `normalizePageMeta` and the `Page` type.
- Fix `ModularBlockRenderer`'s `hero_block` case to render an **array** of banners.

### Phase 2 — Browse route wiring

- In [browse/page.tsx](../src/app/browse/page.tsx): also call `getPageBySlug("browse")`; add
  `generateMetadata` from the page's SEO. Pass `page.sections` into `BrowseClient` (or render
  `ModularBlockRenderer` above it).
- Fallback: if no `browse` page entry exists, render today's behaviour so nothing breaks.

### Phase 3 — Landscape grid

- Switch `TitleCard` to `layout="landscape"` and rework the grid columns for wider cards
  (e.g. `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) instead of the current 2→6.
- Drive the page `<h1>` from `page.title` (avoid duplicating a CMS hero headline). Keep the live
  result count.

### Phase 4 — Verify

- Run the app; confirm filters/sort/genre pills still work, landscape cards render, and an
  editor-added Hero/CTA appears above the grid. Confirm Live Preview still works (params are already
  forwarded).

## Suggestions beyond the ask

- Keep the existing results-count-aware empty state.
- Consider a `genre_spotlight_block` on browse to showcase editorial picks above the exhaustive grid.
- Optional follow-up: the `title_grid_block` block type for full editor control of grid placement.
