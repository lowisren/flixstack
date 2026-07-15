# CMS Editor Experience Plan

A plan for Contentstack customizations that make life easier for the content team
editing Flixstack. Everything here is **stack / content-model configuration** (plus a
few optional UI extensions) — none of it requires changes to the Next.js app.

## Current state (as of 2026-07-15)

- **13 content types, 5 global fields, 1 taxonomy** (`content_tags`, 77 terms, referenced by 46 entries).
- **1 locale** (`en-us`).
- **Zero help text / field instructions** anywhere in the model.
- **No workflows, no releases, no publish rules** configured.
- **No field validations** (URLs, hex colours, slugs, score/runtime ranges) and **no default values**.
- Inconsistencies: `episode.synopsis` is plain text while `movie`/`tv_series.synopsis` are rich text; image fields have no alt-text field.
- Live Preview / Visual Builder **is** wired up in the app code.

## Guiding principle

Every change below reduces one of three editor frictions:

- **"What do I put here?"** — guidance
- **"Did I do it right?"** — validation / safety
- **"How do I get this live?"** — workflow / publishing

---

## Tier 1 — Quick wins (highest impact, lowest effort)

### 1. Add field-level help text (instructions) to every field

Right now **not a single field has instructions**. This is the single biggest, cheapest
improvement. For each field add a one-line instruction, e.g.:

- `movie.slug` → "URL-safe identifier, lowercase with hyphens. Must be unique. Changing this breaks existing links."
- `artwork.hero_image` → "Landscape, min 1920×1080, JPG/WebP. Used on the title detail page."
- `artwork.thumbnail` → "Portrait poster, ~2:3 ratio (600×900). Shown in rails and search."
- `title_metadata.score` → "Audience score 0–100. Leave blank if unrated."
- `trailer_url` → "Full YouTube/Vimeo URL, e.g. https://youtube.com/watch?v=…"
- `hero_banner.badge_text` → "Optional overline, keep under ~20 chars (e.g. 'New Season')."
- `site_config.feature_flags.key` → "Must match a flag key the app checks — see the Setup Guide. Typos silently disable the feature."

### 2. Add field validations to prevent bad data reaching the site

- **Slugs** (`movie`, `tv_series`, `genre`, `person`, `page`): regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- **Hex colour** (`genre.color_accent`): regex `^#([0-9a-fA-F]{6})$`.
- **URLs** (`trailer_url`, `seo.canonical_url`, nav/CTA links): URL format validation.
- **Number ranges**: `score` 0–100, `runtime`/`duration` > 0, `episode_number`/`season_number` ≥ 1.
- **SEO character limits**: `meta_title` ≤ 60, `meta_description` ≤ 160 (with the built-in character counter so editors see remaining chars).

### 3. Set default values

- `title_metadata.content_tier` → `free`
- `tv_series.status` → `ongoing`
- `header.show_search` / `show_profile` → `true`
- `homepage_rail.layout` → `landscape`, `rail_type` → `editorial`

Editors then only change the exception, not the norm.

### 4. Fix the rich-text inconsistency

`movie.synopsis` and `tv_series.synopsis` are JSON RTE, but `episode.synopsis` is plain
text. Make `episode.synopsis` JSON RTE too so the editing experience (and rendering) is
consistent across all synopses.

### 5. Add alt-text fields to images

The `artwork` global field and standalone image fields (`genre.hero_image`,
`header.logo`, `hero_banner.background_image`, `person.photo`) have **no alt text**. Add a
companion `*_alt` text field (or use asset-level descriptions) — an accessibility
requirement and an easy editor habit to enforce with instructions.

### 6. Convert small enums to radio buttons

Short choice lists edit faster as radios than dropdowns: `content_tier` (free/premium),
`rail_type` (editorial/automated), `tv_series.status`, `promo_block.layout`. Also review
option ordering (most-common first).

---

## Tier 2 — Editorial process & safety

### 7. Introduce a Workflow (currently none exists)

Add a stage-based workflow for `movie`, `tv_series`, `episode`, `page`, `hero_banner`,
`homepage_rail`: `Draft → In Review → Ready to Publish → Published`. Benefits:

- Reviewers get a clear queue; nothing goes live by accident.
- Stage-transition **email notifications** to editors/approvers.
- **Stage permissions** so only approvers can move to "Ready to Publish."

### 8. Define Roles & Permissions

Separate **Content Editor** (create/edit, submit for review), **Reviewer/Publisher**
(approve + publish), and **Admin** (model changes). Prevents editors from accidentally
editing content types or publishing to production.

### 9. Publish Rules

Tie publishing to workflow — e.g. an entry can only be published to `production` from the
"Ready to Publish" stage. Optionally require the SEO fields to be filled before that
transition.

### 10. Use Releases for coordinated launches

A new title launch usually touches several entries at once (the `movie`, a
`homepage_rail`, maybe a `hero_banner`). **Releases** let editors bundle those and
publish/schedule them atomically to production — no half-launched state. Also enables
**scheduled publishing** (e.g. a title that unlocks at midnight, matching the existing
`availability_window` fields).

---

## Tier 3 — In-context editing & sidebar tooling

### 11. Polish Visual Builder / Live Preview coverage

It's already wired up. Make it excellent:

- Ensure **edit tags on every rendered field** (the `modular-block-renderer` uses a looser `data-cs-*` scheme rather than SDK `data-cslp` tags — align it so blocks are click-to-edit).
- Set **Live Preview start URLs** per content type so opening any `movie`/`page` entry lands the editor on the right rendered page.

### 12. Add sidebar/dashboard widgets

- **Dashboard widget**: a "Getting Started" panel (reuse the Setup Guide content) + quick links to create the common types + a publish-queue snapshot.
- **Sidebar widget on `movie`/`tv_series`**: "Where this appears" — which rails/hero/pages reference this title (uses the references API), so editors understand blast radius before editing.
- **SEO preview widget**: renders the Google/OG snippet from the `seo` global field live.

### 13. Custom fields / UI extensions for awkward inputs

- **Colour picker** for `genre.color_accent` (instead of typing hex).
- **Video URL field** with inline thumbnail preview for `trailer_url`.
- **Feature-flag field**: replace the free-text `feature_flags.key` group with a custom dropdown populated from the known flag keys — eliminates the silent-typo failure mode.

---

## Tier 4 — Assets, taxonomy & scale

### 14. Asset governance

- Create **asset folders** (posters, hero art, people, logos) and a naming convention.
- Encourage **image focal points** so automatic crops (portrait thumb vs landscape hero) stay well-composed.
- Enforce alt text / descriptions on upload (ties to #5).

### 15. Taxonomy expansion

`content_tags` is well used (77 terms, 46 entries). Consider additional governed
taxonomies where free text or references are overkill — e.g. **mood**,
**franchise/collection**, **maturity themes** — to power filtering and automated rails
consistently.

### 16. Entry-title conventions for reference pickers

For non-page types chosen in reference pickers (`homepage_rail`, `hero_banner`,
`navigation`, `header`, `footer`), the entry **Title** is all an editor sees when picking.
Add instructions establishing naming conventions (e.g. rail titled
"Home – Row 3 – Trending Now") so pickers are self-explanatory.

### 17. (If relevant) Localization readiness

Only `en-us` exists today. If multi-region is on the roadmap, decide now which fields are
**non-localizable** (slugs, keys, hex colours, flags) vs localizable (titles, synopsis,
SEO) — marking them now saves a painful retrofit and de-clutters the editor once locales
are added.

---

## Suggested sequencing

1. **Week 1:** Tier 1 (help text, validation, defaults, alt text, enum display) — pure model config, immediate editor relief.
2. **Week 2:** Tier 2 (workflow, roles, releases) — the editorial backbone.
3. **Ongoing:** Tier 3 widgets/extensions and Tier 4 governance as capacity allows.
