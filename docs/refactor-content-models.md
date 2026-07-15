# Restructure Flixstack content models for structured-content best practices

## Context

The Flixstack Contentstack stack has 12 content types + 2 global fields, but the model
under-uses Contentstack's repeatable-pattern capabilities and violates several structured-content
best practices:

- **Heavy duplication:** `movie` and `tv_series` repeat ~13 identical fields (rating, release_date,
  synopsis, genres, cast, artwork, content_tier, score, availability, tags). Nothing is shared.
- **No governed vocabularies:** `rating`, `content_tier`, `status`, `role`, `rail_type`,
  `layout` are all free **text** — editors can type anything, even though the frontend treats them
  as fixed unions (`"free" | "premium"`, `"ongoing" | "ended" | "upcoming"`, …). `content_tags`
  is free-text multiple (e.g. `"sci-fi"`, `"oscar-winner"`) with no consistency.
- **Repeated CTA/link shapes:** `cta_label` + `cta_url` is copy-pasted onto `hero_banner`,
  `header`, and `page.promo_block`; `navigation.links` re-declares a link shape inline.
- **Inconsistency:** `movie` has the `seo` global field but `tv_series` does **not**.
- **JSON hack:** `site_config.feature_flags` is a JSON-RTE field (a workaround, per
  `content-models/MIGRATION_STATUS.md`) rather than structured key/value data.

**Goal:** apply Contentstack's global fields, select/enum fields, and taxonomy to make the model
DRY, governed, and consistent — then update the Next.js app to match. Decisions confirmed with the
user: (1) keep `movie`/`tv_series` separate but extract shared **global fields**; (2) do all model
work on a **new Contentstack branch** and merge when validated; (3) move tags to a **Taxonomy**;
(4) extract reusable **`cta`** and **`link`** global fields.

**Key architectural lever:** [normalize.ts](src/lib/contentstack/normalize.ts) is the single mapping
layer between raw Delivery-API entries and the app's flat types in [types.ts](src/lib/types.ts).
By keeping the *app-facing* types stable and absorbing the new nested CMS shapes inside `normalize`,
the many consuming components (hero, rail, title-card, detail pages, modular-block-renderer) need
little or no change.

---

## Part A — Contentstack model changes (all on a new branch)

Use the `mcp__contentstack__*` tools. First: `create_a_branch` from `main` (e.g. `content-model-v2`).
Creating the branch clones current content types, global fields, and the seeded draft entries, so
migration happens in isolation. All steps below run against that branch.

### A1. New global fields (`create_a_global_field`)

- **`cta`** — `label` (text), `url` (text), `style` (enum: `primary` | `secondary` | `ghost`,
  default `primary`), `open_in_new_tab` (boolean). Reused by `hero_banner`, `header`, `promo_block`.
- **`link`** — `label` (text), `href` (text), `open_in_new_tab` (boolean). Reused by
  `navigation.links` (as a *multiple* global field).
- **`artwork`** — `hero_image` (file), `thumbnail` (file). Reused by `movie`, `tv_series`.
- **`title_metadata`** — the shared scalar catalog fields: `rating` (enum, see A2),
  `content_tier` (enum: `free` | `premium`), `release_date` (isodate), `score` (number).
  Reused by `movie`, `tv_series`.
  - Note: Contentstack global fields can't nest other global fields, so `seo` and
    `availability_window` stay as their own top-level global-field slots on each type (not inside
    `title_metadata`). `genres`/`cast` stay top-level references too — they're first-class
    editorial relationships and keeping them top-level keeps `includeReference` paths simple.
- Keep existing **`seo`** and **`availability_window`** globals as-is.

### A2. Convert free-text fields to enums (`enum.choices` — note the `choices` key, per MIGRATION_STATUS.md)

- `rating` → choices: `G, PG, PG-13, R, NC-17, TV-Y, TV-PG, TV-14, TV-MA` (lives in `title_metadata`).
- `content_tier` → `free, premium` (in `title_metadata`).
- `tv_series.status` → `ongoing, ended, upcoming`.
- `person.role` → `actor, director, producer, writer`, set **`multiple: true`** (a person can hold
  more than one role — this is a small frontend type change, see B2).
- `homepage_rail.rail_type` → `editorial, automated`; `homepage_rail.layout` → `landscape, portrait, hero`.
- `page.promo_block.layout` → `left, right, center`.
- `cta.style` → `primary, secondary, ghost`.

### A3. Taxonomy for tags (`create_a_taxonomy`, `create_a_term`)

- Create taxonomy `content_tags`. Seed terms from the distinct tag values currently in
  [mock-data.ts](src/lib/mock-data.ts) (`heist`, `sci-fi`, `oscar-winner`, `action`, `superhero`, …).
- Attach a taxonomy field (uid `content_tags`) to `movie` and `tv_series`, replacing the current
  free-text `content_tags` field.

### A4. Per-content-type edits (`update_content_type`)

- **`movie`:** replace top-level `rating`/`content_tier`/`release_date`/`score` with the
  `title_metadata` global; replace `hero_image`/`thumbnail` with `artwork`; replace `content_tags`
  text with the taxonomy field. Keep `synopsis` (RTE), `runtime`, `trailer_url`, `genres`, `cast`,
  `director`, `seo`, `availability_window`.
- **`tv_series`:** same `title_metadata` + `artwork` + taxonomy swaps; **add the `seo` global
  field** (consistency fix); `status` → enum. Keep `creator`, `seasons` blocks, `genres`, `cast`,
  `availability_window`.
- **`hero_banner`:** replace `cta_label`/`cta_url` with the `cta` global field.
- **`header`:** replace `cta_label`/`cta_url` with the `cta` global field.
- **`page` → `promo_block`:** replace `cta_label`/`cta_url` with `cta`; `layout` → enum.
- **`navigation`:** replace the inline `links` group with a *multiple* `link` global field.
- **`person`:** `role` → multiple enum.
- **`site_config`:** replace `feature_flags` (JSON-RTE) with a *multiple* group of
  `{ key: text, enabled: boolean }` — structured, editable flags.
- **`genre`:** add the `seo` global field (genre pages exist at `/genre/[slug]`). Otherwise
  unchanged.

### A5. Entry data migration

The seeded draft entries (20 movies, 3 series, 15 people, etc.) still carry the *old* flat field
paths after A4. Reshape them on the branch — cleanest path is to **update `scripts/seed.ts`** to
emit the new nested shapes (`title_metadata: { rating, content_tier, … }`, `artwork: { hero_image,
thumbnail }`, `cta: { … }`, taxonomy term refs, multiple-`role`) and re-run it against the branch;
alternatively drive `update_an_entry` per entry via MCP. Reference-field format and modular-block
format are documented in `content-models/ENTRY_SEED_STATUS.md`.

### A6. Merge to main

Once the frontend validates against the branch (see Verification), `merge_branch` back into `main`.

---

## Part B — Frontend changes

Point the app at the branch during development, then keep the code after merge.

### B1. Branch support — [client.ts](src/lib/contentstack/client.ts)
Add `branch: process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH ?? "main"` to `CS_CONFIG` and pass
`branch` into the `contentstack.stack({ … })` call in `createStack()`. Document the new env var in
the header comment and `.env.local.example`.

### B2. Types — [types.ts](src/lib/types.ts)
Keep `Movie`/`TvSeries`/`HeroBanner` etc. **flat and stable** so components don't churn. Only real
change: `Person.role` becomes `role: Array<"actor" | "director" | "producer" | "writer">`.
Optionally add a `Cta` interface if we choose to surface `style` in the UI.

### B3. Mapping — [normalize.ts](src/lib/contentstack/normalize.ts) (the main work)
Flatten the new nested CMS shape back into the existing app types:
- `normalizeMovie`/`normalizeTvSeries`: read `raw.title_metadata?.rating|content_tier|release_date|
  score`, `raw.artwork?.hero_image|thumbnail`; map the taxonomy field to `tags: string[]` (term
  uids/labels); add `seo` for tv_series.
- `normalizePerson`: map `role` array.
- `normalizeHeroBanner`/`normalizeHeader`: read `raw.cta?.label|url` into the existing
  `cta_label`/`cta_url` fields (or the new `Cta` shape).
- `normalizeNavigation`: `links` now come from the `link` global field (same `label`/`href`/
  `open_in_new_tab` keys — minimal change).
- `normalizeSiteConfig`: fold the `{key, enabled}[]` group into the existing
  `feature_flags: Record<string, boolean>`.
- Update `promo_block` handling in `getPageBySlug`/renderer path to read `cta` (see B5).

### B4. Queries — [queries.ts](src/lib/contentstack/queries.ts)
`genres`/`cast`/`director`/`creator` stay top-level, so `MOVIE_REFERENCES` /
`TV_SERIES_REFERENCES` `includeReference` paths are unchanged. Global fields and taxonomy values
return inline (no include needed). Verify no query filters/sorts referenced a moved path
(e.g. sorting by `score` now at `title_metadata.score` if we ever query it server-side —
currently `getTrendingTitles` sorts in JS after normalize, so it's unaffected).

### B5. Components
Because app types stay flat, most components are untouched. The one to check:
[modular-block-renderer.tsx](src/components/cms/modular-block-renderer.tsx) `promo_block` reads
`promo.cta_url`/`promo.cta_label` — either keep those keys in the normalized `PromoBlock` (map from
`cta` in normalize) or update the renderer to read `promo.cta.*`. Prefer mapping in normalize to
avoid component changes. `hero.tsx` and `header.tsx` similarly keep reading `cta_label`/`cta_url`.

### B6. Seed script — [scripts/seed.ts](scripts/seed.ts)
Update to the new nested payload shapes (per A5) so seeding/re-seeding stays the source of truth.

---

## Verification

1. **Model validation (branch):** after each `create/update` MCP call, re-fetch with
   `get_a_single_content_type` / `get_a_single_global_field` / `get_a_single_taxonomy` and confirm
   the schema (enums have `choices`, globals resolved, taxonomy attached). MIGRATION_STATUS.md
   documents the API quirks (`enum.choices`, `tags` reserved UID, modular-blocks `multiple: true`).
2. **Entry migration:** `get_all_entries` per type; spot-check one movie + one series entry have
   populated `title_metadata`, `artwork`, taxonomy terms, and (series) `seo`.
3. **Frontend end-to-end:** set `NEXT_PUBLIC_CONTENTSTACK_BRANCH=content-model-v2`, run `next dev`,
   and drive the real flows via the `/run` or `/verify` skill — home page rails, a movie detail
   (`/[slug]`), a TV detail (seasons/episodes), `/genre/[slug]`, `/search`. Confirm ratings, tiers,
   tags, artwork, and CTAs still render. Watch the server logs for normalize errors.
4. **Live Preview:** confirm `data-cslp` edit tags still resolve (nested global-field paths change
   the tag paths — verify in Visual Builder against the branch).
5. **AGENTS.md constraint:** this repo pins a modified Next.js — before writing frontend code, read
   the relevant guide under `node_modules/next/dist/docs/` (data fetching / env / config), per
   AGENTS.md.
6. **Merge:** only after 3–5 pass, `merge_branch` to `main` and set the app's branch env back to
   `main`.

## Rollback
All model changes live on the `content-model-v2` branch; `main` is untouched until the final
`merge_branch`. If anything is wrong, delete the branch (`delete_a_branch`) and no live content is
affected.
