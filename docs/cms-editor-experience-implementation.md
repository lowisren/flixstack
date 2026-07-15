# CMS Editor Experience — Implementation Spec

Ready-to-apply configuration for the customizations described in
[cms-editor-experience-plan.md](cms-editor-experience-plan.md). This document is the
build sheet: exact help-text strings, validation regexes, default values, display types,
workflow stages, role matrix, and extension specs — field by field.

> Nothing here has been applied to the stack. It is a specification to review, then apply
> via the Contentstack UI or the Management API.
>
> **Automated rollout for Tier 1:** [`scripts/customize-editor-fields.mjs`](../scripts/customize-editor-fields.mjs)
> applies §1.1–§1.4 via the Management API. Preview first with
> `pnpm customize-fields all --dry` (read-only), then run `pnpm customize-fields all`;
> the `rte` phase (episode synopsis) is deliberately separate — see §1.4.

**Model reference:** 13 content types, 5 global fields (`title_metadata`, `artwork`, `seo`,
`cta`, `link`, `availability_window`), 1 taxonomy (`content_tags`), locale `en-us`.

---

## Tier 1 — Field configuration

### 1.1 Help text (field instructions)

Set each field's **Instruction / Help text** to the string below. Grouped by content type
and global field. Fields not listed (structural blocks/groups) inherit guidance from their
child fields.

#### Global field: `title_metadata`
| Field | Help text |
|---|---|
| `rating` | Content rating. Use the MPAA scale (G–NC-17) for films and the TV scale (TV-Y–TV-MA) for series. |
| `content_tier` | `free` shows to everyone; `premium` gates the title behind sign-in. Defaults to free. |
| `release_date` | Original theatrical / broadcast release date. Used for sorting and "New" badges. |
| `score` | Audience score, 0–100. Leave blank if the title is unrated. |

#### Global field: `artwork`
| Field | Help text |
|---|---|
| `hero_image` | Landscape key art, min 1920×1080, JPG or WebP, under 1 MB. Shown full-width on the title detail page. |
| `thumbnail` | Portrait poster, 2:3 ratio (e.g. 600×900), JPG or WebP. Shown in rails, search, and cards. |

#### Global field: `seo`
| Field | Help text |
|---|---|
| `meta_title` | Browser tab + search result title. Aim for 50–60 characters. Falls back to the entry title if blank. |
| `meta_description` | Search result snippet. Aim for 150–160 characters. |
| `og_image` | Social share image, 1200×630. Falls back to the hero image if blank. |
| `canonical_url` | Only set if this content also lives at another URL. Leave blank otherwise. |

#### Global field: `cta` (used by `hero_banner`, `header`)
| Field | Help text |
|---|---|
| `label` | Button text. Keep it short and action-led, e.g. "Watch now", "Start free trial". |
| `url` | Where the button goes. Use a site-relative path (`/watch/the-signal`) for internal links. |
| `style` | `primary` = solid brand button, `secondary` = outlined, `ghost` = text-only. |
| `open_in_new_tab` | Enable only for links leaving Flixstack. |

#### Global field: `link` (used by `navigation.links`)
| Field | Help text |
|---|---|
| `label` | The text shown in the menu. |
| `href` | Site-relative path (`/browse`) or full URL for external links. |
| `open_in_new_tab` | Enable only for external links. |

#### Global field: `availability_window`
| Field | Help text |
|---|---|
| `available_from` | Title goes live at this date/time. Leave blank to publish immediately. |
| `available_until` | Title is hidden after this date/time. Leave blank to keep it available indefinitely. |
| `regions` | Comma-separated region codes where this title is available (e.g. `US, CA, UK`). Blank = all regions. |

#### `movie`
| Field | Help text |
|---|---|
| `title` | Public-facing film title exactly as it should appear on the site. |
| `url` | Auto-managed page path. Do not edit unless you know the routing implications. |
| `slug` | URL-safe id, lowercase with hyphens. Must be unique. Changing it breaks existing links and bookmarks. |
| `synopsis` | 1–3 sentence description shown on the detail page. Required. |
| `runtime` | Total runtime in whole minutes. |
| `genres` | One or more genres. Drives genre pages and related rails. |
| `cast` | Billed cast, in credit order. Link existing People or create new ones. |
| `director` | The film's director. |
| `trailer_url` | Full YouTube or Vimeo URL, e.g. `https://youtube.com/watch?v=…`. |
| `taxonomies` (Tags) | Themes/moods from the Content Tags vocabulary. Use existing terms; don't invent one-offs. |

#### `tv_series`
| Field | Help text |
|---|---|
| `title` | Public-facing series title. |
| `slug` | URL-safe id, lowercase with hyphens. Must be unique. Changing it breaks existing links. |
| `synopsis` | 1–3 sentence series description shown on the detail page. |
| `genres` | One or more genres. |
| `cast` | Main cast, in billing order. |
| `creator` | Series creator / showrunner. |
| `seasons` | Add one Season block per season, each with its episodes. |
| `status` | `ongoing` = still airing, `ended` = complete, `upcoming` = announced, not yet aired. |
| `taxonomies` (Tags) | Themes/moods from the Content Tags vocabulary. |

##### `tv_series.seasons` (Season block)
| Field | Help text |
|---|---|
| `season_number` | Season number, starting at 1. |
| `release_date` | Date this season premiered. |
| `episodes` | Episodes in air order. |

#### `episode`
| Field | Help text |
|---|---|
| `title` | Episode title. |
| `slug` | URL-safe id, unique within the series. |
| `episode_number` | Episode number within the season, starting at 1. |
| `duration` | Episode length in whole minutes. |
| `synopsis` | 1–2 sentence episode description. |
| `thumbnail` | Landscape still, 16:9 (e.g. 1280×720). |
| `air_date` | Date this episode first aired. |

#### `person`
| Field | Help text |
|---|---|
| `title` (Name) | Full name as it should be credited. |
| `slug` | URL-safe id, lowercase with hyphens. Must be unique. |
| `bio` | Short biography, 1–2 sentences. |
| `photo` | Headshot, square (e.g. 400×400), JPG or WebP. |
| `role` | One or more roles this person is credited for. |

#### `genre`
| Field | Help text |
|---|---|
| `title` | Genre name as shown to viewers, e.g. "Sci-Fi & Fantasy". |
| `slug` | URL-safe id, lowercase with hyphens. Must be unique. |
| `description` | One-line description shown on the genre page header. |
| `color_accent` | Brand accent for this genre as a 6-digit hex, e.g. `#E50914`. Use the colour picker. |
| `hero_image` | Wide banner for the genre page, min 1920×480. |

#### `hero_banner`
| Field | Help text |
|---|---|
| `title` | Headline shown over the banner. |
| `subtitle` | Supporting line under the headline. Keep it short. |
| `background_image` | Full-bleed landscape image, min 1920×1080. Text sits on the left, so keep that area uncluttered. |
| `badge_text` | Optional overline, under ~20 chars (e.g. "New Season"). |
| `linked_title` | The movie or series this banner promotes. Powers the CTA destination. |

#### `homepage_rail`
| Field | Help text |
|---|---|
| `title` | Row heading shown to viewers, e.g. "Trending Now". Also how you'll recognise this rail in pickers. |
| `rail_type` | `editorial` = you pick the titles by hand; `automated` = filled by rules. |
| `items` | The titles in this row, in display order. Used when rail type is editorial. |
| `layout` | `landscape` = wide cards, `portrait` = poster cards, `hero` = single large feature. |

#### `page`
| Field | Help text |
|---|---|
| `title` | Internal page name (also used for SEO fallback). |
| `slug` | URL-safe id, lowercase with hyphens. Must be unique. |
| `sections` | Build the page by stacking Hero, Rail, Promo, and Genre Spotlight blocks in display order. |

##### `page.sections` block help
| Block | Help text |
|---|---|
| `hero_block` | Full-width hero banner(s) at the top of the page. |
| `rail_block` | Embeds an existing Homepage Rail. |
| `promo_block` | Marketing callout with headline, body, image, and a CTA. |
| `genre_spotlight_block` | Highlights a genre with a hand-picked set of titles. |

`promo_block.layout` → "`left`/`right` places the image on that side; `center` stacks it above the text."

#### `header`
| Field | Help text |
|---|---|
| `title` | Internal name for this header configuration. |
| `logo` | Site logo, SVG or transparent PNG, max height 40px display. |
| `main_navigation` | The primary menu shown in the header. |
| `show_search` | Show the search icon in the header. |
| `show_profile` | Show the profile icon in the header. |

#### `footer`
| Field | Help text |
|---|---|
| `title` | Internal name for this footer configuration. |
| `columns` | Footer link columns, left to right. Each column has a heading and a set of links. |
| `columns.heading` | Column title, e.g. "Company". |
| `columns.links` | Navigation entries listed under this column. |
| `legal_text` | Copyright / legal line shown at the very bottom. |

#### `navigation`
| Field | Help text |
|---|---|
| `title` | Internal name for this menu, e.g. "Primary Nav" or "Footer – Company". |
| `links` | Menu items in display order. |

#### `site_config`
| Field | Help text |
|---|---|
| `site_name` | Site name used in titles and metadata. |
| `feature_flags` | Toggles that turn app features on/off. Only add keys the app checks — see the Setup Guide. |
| `feature_flags.key` | Exact flag key (e.g. `enable_search`). A typo silently disables the feature. |
| `feature_flags.enabled` | On/off for this flag. |

#### `setup_guide` (internal / developer-facing — lighter guidance)
| Field | Help text |
|---|---|
| `badge_label` | Small label shown above the guide title. |
| `steps` | Ordered setup steps. |
| `features` | Feature highlights, each anchored for deep-linking. |
| `features.anchor_id` | URL-safe anchor, lowercase-hyphenated, must be unique on the page. |
| `features.icon` | One of: `database`, `layers`, `zap`, `tags`, `users`, `bot`. |

### 1.2 Validations

| Content type . field | Rule | Regex / setting |
|---|---|---|
| `movie/tv_series/genre/person/page.slug`, `episode.slug` | lowercase-hyphenated | `^[a-z0-9-]+$` |
| `genre.color_accent` | 6-digit hex | `^#[0-9a-fA-F]{6}$` |
| `movie.trailer_url` | http(s) URL | `^https?://.+` |
| `cta.url`, `link.href` | site-relative or URL | `^(/|https?://).+` |
| `seo.canonical_url` | http(s) URL (optional) | `^https?://.+` |
| `seo.meta_title` | max length | 60 chars |
| `seo.meta_description` | max length | 160 chars |
| `hero_banner.badge_text` | max length | 24 chars |
| `title_metadata.score` | range | min 0, max 100 |
| `movie.runtime`, `episode.duration` | positive int | min 1 |
| `episode.episode_number`, `season_block.season_number` | positive int | min 1 |
| `availability_window.regions` | region-code list | `^[A-Z, ]+$` |
| `setup_guide.features.anchor_id` | lowercase-hyphenated | `^[a-z0-9-]+$` |

> **CMA regex constraint:** Contentstack's Management API rejects backtracking-prone
> regexes (`error_code 116`, "complex validation logic") — no nested groups with
> quantifiers such as `(?:-[a-z0-9]+)*`. The slug / anchor / region patterns above use
> simple character classes for that reason; they're slightly more permissive (they allow
> leading/trailing/double hyphens) but the CMA accepts them. Fixed patterns like the hex
> and `^https?://.+` URL checks are fine as-is.

Enable the **character counter** display option on `seo.meta_title`, `seo.meta_description`,
and `hero_banner.badge_text`.

### 1.3 Default values

| Field | Default |
|---|---|
| `title_metadata.content_tier` | `free` |
| `tv_series.status` | `ongoing` |
| `homepage_rail.rail_type` | `editorial` |
| `homepage_rail.layout` | `landscape` |
| `cta.style` | `primary` |
| `header.show_search` | `true` |
| `header.show_profile` | `true` |
| `link.open_in_new_tab` / `cta.open_in_new_tab` | `false` |

### 1.4 Display type & consistency changes

- **Radio buttons** (small enums): `content_tier`, `rail_type`, `tv_series.status`,
  `promo_block.layout`, `cta.style`.
- **Dropdown** (longer enums): `rating`, `homepage_rail.layout`, `person.role` (multi).
- **Rich text fix:** change `episode.synopsis` from single-line text to JSON RTE (advanced),
  matching `movie.synopsis` / `tv_series.synopsis`.
- **Alt text:** add a companion text field to each image — `artwork.hero_image_alt`,
  `artwork.thumbnail_alt`, `genre.hero_image_alt`, `hero_banner.background_image_alt`,
  `person.photo_alt`, `header.logo_alt`, `episode.thumbnail_alt`. Help text:
  "Describe the image for screen readers and when it fails to load. Required."
  Mark mandatory once existing entries are backfilled.

---

## Tier 2 — Editorial process & safety

> **Automated rollout for Tier 2:** [`scripts/setup-workflow.mjs`](../scripts/setup-workflow.mjs)
> creates the custom roles, the workflow, and the production publish rule. See
> [cms-editor-experience-tier2.md](cms-editor-experience-tier2.md) for the build notes,
> caveats, and the manual (user-invite / notification) follow-up. Preview with
> `pnpm setup-workflow all --dry`.

### 2.1 Workflow: "Editorial Review"

Apply to `movie`, `tv_series`, `episode`, `page`, `hero_banner`, `homepage_rail`,
`genre`, `person`.

| # | Stage | Colour | Meaning | Who can move INTO this stage |
|---|---|---|---|---|
| 1 | **Draft** | grey | Work in progress. Default for new entries. | Content Editor, Reviewer, Admin |
| 2 | **In Review** | amber | Submitted; awaiting editorial check. | Content Editor (submits own work) |
| 3 | **Changes Requested** | red | Reviewer sent it back with notes. | Reviewer, Admin |
| 4 | **Ready to Publish** | blue | Approved; cleared for production. | Reviewer, Admin |
| 5 | **Published** | green | Live on production. | Set automatically on publish |

Transitions: Draft → In Review → (Changes Requested → Draft) or (Ready to Publish) →
Published. Enable **email notifications** on entry into *In Review* (to Reviewers) and
*Changes Requested* / *Ready to Publish* (to the entry owner).

### 2.2 Role matrix

| Capability | Content Editor | Reviewer / Publisher | Admin |
|---|---|---|---|
| Create / edit entries | ✅ | ✅ | ✅ |
| Move to **In Review** | ✅ | ✅ | ✅ |
| Move to **Ready to Publish** | ❌ | ✅ | ✅ |
| Publish to **development** | ✅ | ✅ | ✅ |
| Publish to **production** | ❌ | ✅ | ✅ |
| Manage assets | ✅ | ✅ | ✅ |
| Edit content types / global fields | ❌ | ❌ | ✅ |
| Manage workflows / roles / tokens | ❌ | ❌ | ✅ |
| Create releases | ✅ | ✅ | ✅ |
| Deploy releases to production | ❌ | ✅ | ✅ |

### 2.3 Publish rules

- Entries under the workflow can be published to **production** only from the
  **Ready to Publish** stage.
- Require an approver (Reviewer/Admin) to approve the production publish action.
- Optional gate: block the *Ready to Publish* transition on `movie`/`tv_series`/`page`
  unless `seo.meta_title` and `seo.meta_description` are filled.

### 2.4 Releases (coordinated launches)

Establish a naming convention: `Launch – <Title> – <YYYY-MM-DD>`. A typical title launch
release bundles:

- the `movie` / `tv_series` entry,
- any `homepage_rail` it's added to,
- an optional `hero_banner`,
- referenced new `person` entries.

Deploy the whole release to production at once (or schedule it to the title's
`available_from`). Reviewers/Admins deploy; Editors assemble.

---

## Tier 3 — In-context editing & tooling

> **Scope & sequencing for Tier 3:** [cms-editor-experience-tier3.md](cms-editor-experience-tier3.md)
> breaks these into work items with delivery mechanism (app code / stack config / UI
> extension), scriptability, and effort. Unlike Tiers 1–2, most of Tier 3 is app-code or a
> built-and-hosted extension, not a one-shot CMA script — the exception is the
> content-type `url_pattern` fix (3.1a), which is scriptable.

### 3.1 Visual Builder / Live Preview

- Align `modular-block-renderer` to emit SDK `data-cslp` edit tags (not the looser
  `data-cs-*` scheme) so every block on `page` entries is click-to-edit. *(App code change —
  tracked here for completeness; out of scope for the CMS-only rollout.)*
- Set **per-content-type Live Preview start URLs** in stack settings:
  | Content type | Start URL pattern |
  |---|---|
  | `movie` / `tv_series` | `/watch/{slug}` |
  | `genre` | `/genre/{slug}` |
  | `page` | `/{slug}` |
  | `homepage_rail` / `hero_banner` / `header` / `footer` / `site_config` | `/` |

### 3.2 Sidebar & dashboard widgets (UI extensions)

| Widget | Type | What it does |
|---|---|---|
| Getting Started | Dashboard | Reuses Setup Guide content + "Create movie / series / rail" quick links + publish-queue count. |
| "Where this appears" | Sidebar (`movie`, `tv_series`) | Lists rails / heroes / pages referencing this title (references API) so editors see blast radius. |
| SEO Preview | Sidebar (`movie`, `tv_series`, `page`, `genre`) | Renders the Google + OG card live from the `seo` global field. |

### 3.3 Custom field extensions

| Field | Extension |
|---|---|
| `genre.color_accent` | Native colour picker (writes `#RRGGBB`). |
| `movie.trailer_url` | URL field with inline video thumbnail preview + "invalid link" warning. |
| `site_config.feature_flags.key` | Dropdown populated from the known flag keys, replacing free text. |

---

## Tier 4 — Assets, taxonomy & scale

> **Scope & sequencing for Tier 4:** [cms-editor-experience-tier4.md](cms-editor-experience-tier4.md)
> breaks these into work items with mechanism, scriptability, and effort. Most of Tier 4 is
> CMA-scriptable (folders, alt backfill, taxonomies, non-localizable flags). Note the
> corrections it records: assets are currently un-foldered (but well-named), and
> `homepage_rail`/`hero_banner` titles are viewer-facing so can't become internal-only
> labels.

### 4.1 Asset folders & naming

Create folders and a naming convention:

```
/posters      poster-<slug>.jpg           (2:3)
/hero-art     hero-<slug>.jpg             (16:9)
/people       person-<slug>.jpg           (1:1)
/logos        logo-<name>.svg
/genre-art    genre-<slug>.jpg            (wide)
/promo        promo-<campaign>.jpg
```

- Turn on **image focal points** so portrait/landscape auto-crops stay well composed.
- Require a **Description** (alt) on every asset at upload; pair with the per-field alt
  text from §1.4.

### 4.2 Taxonomy governance

- Keep `content_tags` (77 terms) as the single themes/moods vocabulary; disallow ad-hoc
  free-text tagging.
- Candidate new governed taxonomies: **mood**, **franchise / collection**,
  **maturity themes**. Add only if a filtering or automated-rail use case exists.

### 4.3 Entry-title conventions (reference pickers)

For types picked by reference, the entry **Title** is all the editor sees:

| Type | Title convention | Example |
|---|---|---|
| `homepage_rail` | `Home – Row N – <Name>` | `Home – Row 3 – Trending Now` |
| `hero_banner` | `Hero – <Title/Campaign>` | `Hero – The Signal Launch` |
| `navigation` | `<Location> Nav` | `Primary Nav`, `Footer – Company` |
| `header` / `footer` / `site_config` | `<Site> – <Type>` | `Flixstack – Header` |

### 4.4 Localization readiness (only if multi-region is planned)

Mark these fields **non-localizable** before adding locales: all `slug`, `url`,
`color_accent`, `feature_flags.key`, `availability_window.regions`, `anchor_id`.
Keep localizable: titles, `synopsis`, `bio`, `description`, all `seo` text, CTA labels.

---

## Rollout order

1. **Tier 1** — help text, validations, defaults, display types, alt-text fields (model config; immediate relief).
2. **Tier 2** — workflow, roles, publish rules, release convention (editorial backbone).
3. **Tier 3 / Tier 4** — widgets, extensions, asset + taxonomy governance, as capacity allows.

Backfill note: apply alt-text and SEO gates as **optional** first, backfill existing
entries, then flip to **mandatory** to avoid blocking editors mid-flight.
