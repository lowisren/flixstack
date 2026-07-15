# CMS Editor Experience — Tier 4 Scope (Assets, taxonomy & scale)

Scoping for Tier 4 of [cms-editor-experience-plan.md](cms-editor-experience-plan.md): asset governance, taxonomy expansion, entry-title conventions, and localization readiness. Most of Tier 4 **is** Management-API-scriptable (unlike Tier 3) — the exceptions are image focal points and the human discipline around naming/translation.

Effort key: **S** ≈ ≤½ day · **M** ≈ 1–3 days · **L** ≈ \~1 week+.

## Running the script

The scriptable phases are in `scripts/content-governance.mjs`(alias `pnpm content-governance`). Every phase supports `--dry` (read-only preview) and is idempotent.

```bash
# Preview everything, write nothing:
pnpm content-governance all --dry

# Apply the reliably-beneficial set (folders + alt backfill + non-localizable flags):
pnpm content-governance all

# Or one phase at a time:
pnpm content-governance folders          # create folders, move 85 assets in by filename
pnpm content-governance alt              # backfill asset Description from title (a11y)
pnpm content-governance nonlocalizable   # mark structural fields non_localizable

# OPT-IN — review the starter vocabularies in the script first:
pnpm content-governance taxonomies --dry
pnpm content-governance taxonomies
```

Dry-run verified against the live stack: **85/85 assets route cleanly** (0 unrouted) into `posters / hero-art / episode-stills / people / genre-art` (+ empty `logos`, `promo` for future use); **85 descriptions** backfilled; **14 fields** across 8 content types + 1 global field marked non-localizable with no missing paths.

> `taxonomies` is **not** in `all` — it creates real vocabularies and edits the movie/ tv_series schema, and the starter term lists (mood / franchise / maturity_themes) are placeholders to review with the content team before running.

## Findings that shape this tier (verified 2026-07-15)

- **Assets: no folders.** Every asset sampled has `parent_uid: null` — the media library is flat. But **naming is already good**: files like `movie-oppenheimer-hero.jpg`, titles like "Movie: Oppenheimer – Hero". So the work is *foldering + backfilling alt text*, not renaming.
- **Entry titles are mixed by design.** `navigation` already uses clean internal names ("Main Navigation", "Footer - Browse"). But `homepage_rail.title` ("Trending Now") and `hero_banner.title` ("Oppenheimer") are **rendered to viewers** — so they can't be rewritten into internal-only "Home – Row 3 – …" labels without changing the UI. This corrects plan §16 (see 4.3).
- **Localization is greenfield.** One locale (`en-us`); **no field is marked** `non_localizable`. Marking them is a prerequisite before adding any locale.
- **Taxonomy is healthy.** `content_tags`: 77 terms, referenced by 46 entries; tagging is already governed (a taxonomy field, not free text).
- Asset listing must use the **Management** `/assets` endpoint with the management token (the delivery/CDN read is not authorized for this).

## Summary

| \# | Item | Mechanism | Scriptable? | Effort | Value |
| --- | --- | --- | --- | --- | --- |
| 4.1a | Asset folders + move existing assets in | CMA | ✅ | S–M | Med |
| 4.1b | Backfill asset alt/description | CMA | ✅ | S | High |
| 4.1c | Image focal points | Asset UI | ❌ manual | S (ongoing) | Med |
| 4.2a | Confirm governed-only tagging (no free text) | Model check | ✅ (already) | S | — |
| 4.2b | New taxonomies (mood / franchise / maturity) | CMA | ✅ | M | Med |
| 4.3 | Entry-title conventions | Guidance + light renames | ⚠️ partial | S | Med |
| 4.4a | Mark non-localizable fields | CMA | ✅ | S | High (if L10n) |
| 4.4b | Add locale(s) + translation flow | CMA + process | ⚠️ setup ✅, process ❌ | L | Cond. |

✅ scriptable · ⚠️ partly · ❌ manual

---

## 4.1 Asset governance

### 4.1a — Folders + move assets · CMA-scriptable · S–M

Create a folder tree and move existing assets in by setting each asset's `parent_uid`.

```
/posters      poster-<slug>.jpg      (2:3)
/hero-art     <type>-<slug>-hero.jpg (16:9)   ← matches current naming
/people       person-<slug>.jpg      (1:1)
/logos        logo-<name>.svg
/genre-art    genre-<slug>.jpg       (wide)
/promo        promo-<campaign>.jpg
```

Deliverable: a script (same idempotent `--dry` pattern as Tier 1/2) that creates folders via `POST /v3/assets/folders` and reassigns each asset's `parent_uid` by matching the existing filename prefix (`movie-…`/`tv-series-…`→hero-art, `poster-…`→posters, etc.). Because filenames already encode type, routing is deterministic.

### 4.1b — Backfill asset alt/description · CMA-scriptable · S · High value

Tier 1 added per-field `*_alt` fields; the asset-level **Description** is the other half (used when an asset is reused without a field alt). Backfill each asset's `description` from its human title (e.g. "Movie: Oppenheimer – Hero"). Script: `PUT /v3/assets/{uid}` per asset. Pairs with flipping the Tier 1 alt fields to mandatory once done.

### 4.1c — Image focal points · manual · S (ongoing)

Focal points (so portrait thumb vs. landscape hero crops stay composed) are set per asset in the Contentstack image editor — not reliably scriptable. Document it as an upload-time habit; not a one-off task.

---

## 4.2 Taxonomy governance

### 4.2a — Governed-only tagging · already in place · S

`content_tags` is a real taxonomy field on `movie`/`tv_series`, not free text — so this is effectively done. Action: a one-line audit confirming no content type exposes an ad-hoc tag/keyword text field, plus the Tier 1 help text ("use existing terms; don't invent one-offs"), which is already applied.

### 4.2b — New taxonomies · CMA-scriptable · M

Add governed vocabularies only where a filtering / automated-rail use case exists:

| Taxonomy | Example terms | Powers |
| --- | --- | --- |
| **mood** | cozy, tense, feel-good, dark, cerebral | mood-based rails / filters |
| **franchise / collection** | Dune, MCU, A24 | "More from this collection" |
| **maturity themes** | violence, language, substances | parental filtering |

Effort is mostly vocabulary design + stakeholder sign-off; creation is `POST /v3/taxonomies` + `POST /v3/taxonomies/{uid}/terms` (same shape as the existing `migrate-v2.mjs terms` phase), then adding a taxonomy field to `movie`/`tv_series`.

**Decisions (2026-07-15):** proceed with all three vocabularies (mood, maturity_themes,
franchise — franchise noted as thin against the current catalog, kept for future growth).
Separate fields per taxonomy were requested, but **Contentstack allows only one taxonomy
field per content type, with a fixed uid of `taxonomies`** (`error_code 121`). So the three
vocabularies were added to that single field instead — each still renders as its own
labeled picker section in the entry editor, so editors get per-taxonomy selection.

**Applied 2026-07-15:** taxonomies `mood` (10 terms), `franchise` (5), `maturity_themes`
(5) created; all three added to the `taxonomies` field on `movie` and `tv_series` (now:
`content_tags, mood, franchise, maturity_themes`).

---

## 4.3 Entry-title conventions · guidance + light renames · S

**Corrected from plan §16.** The convention only applies to types whose `title` is *not*rendered to viewers:

| Type | `title` rendered to viewers? | Convention |
| --- | --- | --- |
| `navigation` | No | Already good — keep ("Main Navigation", "Footer - Browse") |
| `header` / `footer` / `site_config` | No | `Flixstack – <Type>` |
| `homepage_rail` | **Yes** (row heading) | Leave as the viewer heading; add an optional internal `admin_title` field if disambiguation is needed |
| `hero_banner` | **Yes** (headline) | Same — don't overload the title |

So this item is mostly (a) light renames of the config singletons and (b) an optional `admin_title` field on `homepage_rail`/`hero_banner` if editors struggle to tell entries apart in pickers. Low effort; largely guidance already delivered via Tier 1 help text.

---

## 4.4 Localization readiness

### 4.4a — Mark non-localizable fields · CMA-scriptable · S · High value (if L10n planned)

No field is non-localizable today. Before any locale is added, mark structural/shared fields so they don't fork per locale and clutter the translation UI:

- **Non-localizable:** every `slug`, `url`, `color_accent`, `feature_flags.key`, `availability_window.regions`, `anchor_id`, `trailer_url`, and reference fields that are language-agnostic.
- **Localizable (leave as-is):** titles, `synopsis`, `bio`, `description`, all `seo` text, CTA labels.

Deliverable: a script that PUTs each content type/global field setting `non_localizable: true` on the listed fields (idempotent). Best done **before** 4.4b.

### 4.4b — Add locale(s) + translation flow · setup scriptable, process not · L · conditional

Only if multi-region is on the roadmap. Setup is scriptable (`POST /v3/locales` with a fallback locale); the real cost is the **process**: who translates, whether to use Automate/AI-assisted translation, fallback behavior, and publishing localized entries. Scope this as its own project if/when prioritized — not part of the editor-experience sweep.

---

## Manual steps — click-by-click (you handle these)

These aren't reliably scriptable; do them in the Contentstack UI. Each is quick.

### A. Image focal points (4.1c)

Prioritise `hero-art` (16:9 art that gets re-cropped to portrait/landscape elsewhere).

1. **Assets** → open the folder (e.g. `hero-art`) → open an image.
2. Click **Edit / Image Editing** → **Set focal point**.
3. Click the subject (face / key object) so auto-crops keep it centred → **Save**.
4. Repeat for the hero images (and any posters that look badly cropped in rails).

### B. Config renames + optional `admin_title` (4.3)

Rename the config singletons so pickers are self-explanatory:

1. **Entries** → open the `header` / `footer` / `site_config` entry.
2. Set **Title** to `Flixstack – Header` (etc.) → **Save**.

If editors can't tell `homepage_rail` / `hero_banner` entries apart in reference pickers, add an internal label field (the entry title itself is shown to viewers, so don't reuse it):

1. **Content Models** → open `homepage_rail` → **+ Add field** → **Single Line Textbox**.
2. Name it **Admin Title**, uid `admin_title`; set instruction "Internal label for pickers, e.g. Home – Row 3 – Trending Now. Not shown to viewers." → **Save content type**.
3. Repeat for `hero_banner`. Then fill it in on existing entries.

### C. Flip the alt fields to mandatory (after the `alt` phase + review)

Once the backfilled asset descriptions have been reviewed:

1. **Content Models** → open the content type (e.g. `genre`) → open the `*_alt` field.
2. Under the field's **Options**, tick **Mandatory** → **Save content type**.
3. Repeat for `hero_banner`, `person`, `header`, `episode`, and the `artwork` global field (`hero_image_alt`, `thumbnail_alt`). Do this only after entries have alt text, or editors will be blocked on save.

### D. Add a locale (4.4b — only if going multi-region)

Do the `nonlocalizable` phase **first**, then:

1. **Settings → Languages → + New Language**.
2. Pick the language and a **Fallback Language** (usually `en-us`) → **Add**.
3. Decide the translation process (manual, or an Automate/AI-assisted flow) and publishing plan before translating at scale — scope this as its own project.

## Scriptable vs. manual, at a glance

- **Scriptable now (CMA):** 4.1a folders + moves, 4.1b alt/description backfill, 4.2b new taxonomies, 4.4a non-localizable flags, 4.4b locale creation.
- **Manual:** 4.1c focal points; the naming/translation discipline; vocabulary sign-off.
- **Already done:** 4.2a governed tagging; most of 4.3 (via Tier 1 help text).

## Recommended sequencing

1. **4.1b** (S, high) — asset alt/description backfill; unblocks making Tier 1 alt fields mandatory. Cheapest accessibility win.
2. **4.1a** (S–M) — folders + moves; deterministic thanks to existing filename prefixes.
3. **4.4a** (S) — mark non-localizable fields now, even if locales are far off; it's far cheaper before content forks.
4. **4.2b** (M) — new taxonomies, once a concrete use case (mood rails, collections) is agreed.
5. **4.3** (S) — config renames + optional `admin_title`, as needed.
6. **4.4b** (L) — only if localization is prioritized; run as a separate project.

The immediately scriptable, high-value starting points are **4.1b** (alt/description backfill) and **4.4a** (non-localizable flags) — both mirror the Tier 1/2 idempotent `--dry` script pattern. I can build either on request.