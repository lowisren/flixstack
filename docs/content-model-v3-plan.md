# Flixstack content model v3 — modular blocks & structured-content lessons

> Status: **approved plan, not yet executed.** Scope and decisions confirmed with the team.

## Context

Flixstack is a **teaching starter template** for Contentstack: developers and content teams use it
to learn how to model and build with the platform. The v2 iteration added global fields, a taxonomy,
and enums. This iteration targets the biggest remaining gap for the teaching goal: **modular blocks
and flexible content composition.**

Today the model uses modular blocks in only two spots (`tv_series.seasons`, `page.sections`), and
even the `page` builder only ever renders `rail_block`. The core catalog types are flat and their
detail pages are entirely hardcoded:

- **`movie`/`tv_series` have no composable body** — `synopsis` is one rich-text field and the whole
  detail page ([src/app/watch/[slug]/page.tsx](src/app/watch/[slug]/page.tsx)) is fixed in code.
- **`cast` is a bare list of `person` references** — no character names, no billing order; the page
  just lists actor names.
- **`trailer_url` is a plain text string** — "stringly-typed" media with no structure.

**Goal:** turn Flixstack into a showcase of Contentstack's content-composition capabilities, framed
as discrete lessons. Confirmed with the user (all recommended options): (1) add a composable
`content_sections` modular-blocks field to **both** `movie` and `tv_series`; (2) model **cast credits
as a repeatable Group** of `{ person, character_name, billing_order }`; (3) **expand and fully wire**
the `page` builder; (4) stay focused — **no new referenced content types** (reviews/collections) this
round.

**The lessons this delivers** (worth calling out in the model itself and the setup guide):
- **Modular blocks = heterogeneous composition** (`content_sections`, expanded `page.sections`).
- **Group = homogeneous repeatable data** (`cast` credits) — the group-vs-blocks distinction.
- **Global fields inside blocks** keep composed content DRY (blocks reuse `cta`, new `media`).
- **Reference vs. inline blocks** — the page builder mixes both on purpose.
- **Replacing a stringly-typed field with structure** (`trailer_url` → `media`).

**Architecture note:** [src/lib/contentstack/normalize.ts](src/lib/contentstack/normalize.ts) remains
the single mapping layer. Unlike v2 (which kept app types flat), modular blocks introduce **new
render surfaces**, so this iteration also adds a small block-renderer for the detail page, mirroring
the existing [src/components/cms/modular-block-renderer.tsx](src/components/cms/modular-block-renderer.tsx).

---

## Part A — Contentstack model changes (on a new branch)

Work on a fresh branch (e.g. `model_v3`, ≤15 chars) cloned from `main`, exactly as v2 did. Reuse the
CMA-REST migration approach in [scripts/migrate-v2.mjs](scripts/migrate-v2.mjs) (new `scripts/migrate-v3.mjs`).

### A1. New `media` global field (`create_a_global_field`)
`media` — `media_type` (enum: `video` | `image`), `video_url` (text), `image` (file), `poster` (file),
`caption` (text). Replaces `movie.trailer_url`; also embedded by the `media_block` below. Teaches
"structure over a bare URL" and global-field reuse inside blocks.

### A2. `content_sections` modular-blocks field on `movie` and `tv_series` (`update_content_type`)
A `blocks [multiple]` field, `content_sections`, with this block set (schemas are defined per content
type — Contentstack has no shared block library — but each reuses global fields to stay DRY):
- `rich_text_block` — `heading` (text), `body` (rich text)
- `media_block` — `media` (global field `media`), `caption` (text)
- `gallery_block` — `images` (file, multiple), `caption` (text)
- `quote_block` — `quote` (text), `attribution` (text), `source_url` (text)  *(pull-quote / critic review)*
- `trivia_block` — `heading` (text), `items` (group multiple: `fact` text)
- `related_titles_block` — `heading` (text), `items` (reference → `movie`, `tv_series`)
- `cta_block` — `cta` (global field `cta`)

### A3. Cast credits — replace flat `cast` with a Group (`update_content_type`, both types)
`cast` becomes `group [multiple]`: `person` (reference → `person`), `character_name` (text),
`billing_order` (number). Keep `director`/`creator` as-is. (Teaching contrast: uniform repeatable
data → Group, not blocks.)

### A4. Expand & standardize the `page` block library (`update_content_type`)
Keep `hero_block`, `rail_block`, `promo_block`, `genre_spotlight_block`; add:
- `rich_text_block` — `heading`, `body` (rich text)  *(inline)*
- `cta_banner_block` — `heading`, `body`, `cta` (gf), `background_image` (file)  *(inline)*
- `faq_block` — `heading`, `items` (group multiple: `question` text, `answer` rich text)  *(inline)*
- `featured_title_block` — `title` (reference → `movie`, `tv_series`), `blurb` (text)  *(reference)*

Teaching point to document: reference blocks (`hero`, `rail`, `featured_title`) point at reusable
standalone entries; inline blocks (`promo`, `faq`, `rich_text`, `cta_banner`) hold one-off content.

### A5. Retire `movie.trailer_url`
Remove after its value is migrated into a `media_block` in `content_sections` (see A6 / Part B).

---

## Part B — Entry migration & seeding (branch, then publish to BOTH environments)

New idempotent `scripts/migrate-v3.mjs` (same structure as v2: schema phase → entry phase →
backfill-from-`main` guard → publish). Ordering lesson from v2 baked in: **read old values before
removing fields, or backfill from a pristine branch.**

- **Cast:** wrap each existing `person` ref into `{ person: [ref], character_name: "", billing_order: i }`.
- **Media:** move each `trailer_url` into a `media_block` (`media_type: "video"`, `video_url: <url>`)
  in `content_sections`.
- **Seed sample blocks** so the lesson is visible: add ~2 example blocks per title (e.g. a
  `rich_text_block` "Behind the scenes" + a `quote_block`, and a `related_titles_block` on a few).
- **Publish to `development` AND `production`** this time — the Launch incident
  ([docs/production-resilience.md](docs/production-resilience.md)) was caused by publishing to
  `development` only. Reuse the `publishprod`/`publishAssets` phases already in the v2 script.

Adding block fields is additive (existing entries get empty blocks — no data loss); only `cast` and
`trailer_url` require true data migration.

---

## Part C — Frontend changes

### C1. Types — [src/lib/types.ts](src/lib/types.ts)
- Add `Media`, `CastCredit` (`{ person: Person; character_name: string; billing_order: number }`),
  and a `ContentSection` discriminated union (one member per A2 block type), mirroring the existing
  `ModularBlock` union.
- `Movie`/`TvSeries`: `cast: CastCredit[]` (**breaking shape change**) and `body: ContentSection[]`;
  drop `trailer_url`.
- Extend the `page` `ModularBlock` union with the A4 blocks.

### C2. Mapping — [src/lib/contentstack/normalize.ts](src/lib/contentstack/normalize.ts) (main work)
- `normalizeCastCredits(raw.cast)` → `CastCredit[]` (unwrap `person` single-ref via existing
  `normalizeSingleReference`, sort by `billing_order`).
- `normalizeContentSections(raw.content_sections)` → typed `ContentSection[]`, following the
  block-unwrap pattern already in `normalizeSeasons` (`block.<block_uid>`), rendering `rich_text`
  bodies via the existing `renderRte` helper and resolving `related_titles_block.items` /
  `media_block.media`.
- `normalizeMedia` for the `media` global field.

### C3. Queries — [src/lib/contentstack/queries.ts](src/lib/contentstack/queries.ts)
- Extend `MOVIE_REFERENCES` / `TV_SERIES_REFERENCES` with the new nested reference paths:
  `cast.person`, `content_sections.related_titles_block.items`.
- Expand `getPageBySlug` to resolve **all** page block types (today it only handles `rail_block`),
  reusing `getHomepageRailByUid` and adding resolution for `featured_title_block.title`.

### C4. Components
- **New** `src/components/cms/content-section-renderer.tsx` — renders a `ContentSection[]` for the
  detail page, switching on `block_type`, directly modeled on
  [modular-block-renderer.tsx](src/components/cms/modular-block-renderer.tsx). Reuse `Rail` for
  `related_titles_block`.
- **[watch/[slug]/page.tsx](src/app/watch/[slug]/page.tsx):** render `<ContentSectionRenderer>` in
  the main column after the synopsis; update the cast list to read `credit.person` + show
  `character_name`.
- **[modular-block-renderer.tsx](src/components/cms/modular-block-renderer.tsx):** add cases for the
  A4 page blocks (`rich_text_block`, `cta_banner_block`, `faq_block`, `featured_title_block`).
- **[src/lib/mock-data.ts](src/lib/mock-data.ts):** align the offline-fallback shapes (`cast` →
  credits, add a couple `body` sections) so types stay consistent and the demo works without CMS.

### C5. Setup guide — [src/app/setup/page.tsx](src/app/setup/page.tsx) (+ `setup_guide` entry)
Add a short "content modeling patterns" section teaching modular blocks vs. groups vs. references,
so the template explains its own model. (The setup page is CMS-driven via the `setup_guide` content
type — update that entry too, or note it for a follow-up.)

---

## Verification

1. **Model (branch):** after each `create/update`, re-fetch with `get_a_single_content_type` /
   `get_a_single_global_field` and confirm block schemas, the `media` global field, and the `cast`
   group. Reuse v2 API-quirk knowledge in [content-models/MIGRATION_STATUS.md](content-models/MIGRATION_STATUS.md).
2. **Entries:** `get_all_entries` spot-checks — a movie has `cast` credits with character names, a
   `media_block` carrying the former `trailer_url`, and seeded sample blocks; `trailer_url` is gone.
3. **Frontend end-to-end** (`/run` or `/verify`): point `NEXT_PUBLIC_CONTENTSTACK_BRANCH` at the new
   branch, run `next dev`, and drive a movie detail, a TV detail (seasons + body), a `page` that uses
   the new blocks, home, and search. Confirm body sections, cast+characters, and media render; watch
   server logs for normalize errors. Run `tsc --noEmit`.
4. **Publish + branch access:** publish entries **and assets** to **both** `development` and
   `production`; confirm the `production` delivery token is scoped to the branch before merge
   (the v2/Launch lesson).
5. **Merge** `model_v3` → `main` with `merge_branch`, then **finalize** exactly as v2 did
   (`merge_branch` is schema-only field-level union + carries no entries): overwrite `main` schemas
   from the branch to drop retired fields (`trailer_url`), sync + publish reshaped entries to both
   environments. Regenerate `content-models/export.json` and update `MIGRATION_STATUS.md`.

## Rollback
All work stays on `model_v3` until the final merge; `main` is untouched. If anything is wrong,
`delete_a_branch` and no live content is affected.

## Scope explicitly deferred
Reviews and collections/franchise content types (offered, declined for focus) — candidates for a
future v4 iteration.
