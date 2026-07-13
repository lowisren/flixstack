# Contentstack content model migration — complete

`content-models/export.json` describes the content model that is now fully live in the connected
Contentstack stack, validated field-by-field against the real Content Management API via the
`mcp__contentstack__*` MCP tools.

## Final state — everything created and live

**8 content types:**
`genre`, `episode`, `person`, `movie`, `tv_series`, `hero_banner`, `homepage_rail`, `site_config`

**4 global fields:**
`seo`, `navigation`, `footer`, `availability_window`

- `movie` embeds both `seo` and `availability_window` as global fields.
- `tv_series` embeds `availability_window` (confirmed with the user — it wasn't referenced by
  anything in the original export, this was an oversight in the original model, now fixed).
- `site_config` embeds `navigation` and `footer`.

## Real bugs found in the original model, via live API trial-and-error

1. **`enum.values` is wrong** — Contentstack's real schema key is `enum.choices`. Confirmed via a
   hard API error: `"schema.4.enum.choices":["is a required field."]`.
2. **`tags` is a reserved field UID** — the API rejects it outright:
   `"schema.14.uid":["has a restricted value 'tags', which is not allowed."]`. Renamed to
   `content_tags` in both `movie` and `tv_series`.
3. **Modular Blocks fields need `"multiple": true` at the field level**, not just inside the block
   schema. Confirmed via: `"schema.11.multiple":["Modular Blocks must be multiple"]`.
4. **`data_type: "rte"` is not a real Contentstack data type.** Rich text is `data_type: "text"`
   with `field_metadata.rich_text_type: "advanced"` plus `allow_rich_text: true`.
5. Reference fields with multiple `reference_to` content types work fine with just
   `field_metadata.ref_multiple` set — the API auto-adds `ref_multiple_content_types: true` itself.
6. **`data_type: "json"` alone is rejected** — `"schema.3.data_type":["cannot set json data type
   for this field"]`. There's no generic "raw JSON blob" field in Contentstack; what's available is
   JSON-RTE, which requires `field_metadata: { allow_json_rte: true, embed_objects: [], multiline:
   false, rich_text_type: "advanced", version: 3 }` plus `reference_to: ["sys_assets"]`. Used for
   `site_config.feature_flags`.
7. The `group` data_type (used in `navigation.nav_links` and `footer.columns`, including nested
   group-in-group for `footer.columns.links`) needed no changes — it worked exactly as modeled on
   the first attempt.

`export.json` no longer has any `_migration_status` or `_status` scaffolding keys — it reflects
the exact schema that is live in the stack.

## Update: header/footer/navigation content types (replacing the nav/footer global fields)

The `navigation` and `footer` global fields (and `site_config`'s embedding of them) were replaced
with three standalone content types, so nav/footer content is Live-Preview-editable — global
fields embedded in a layout-level singleton couldn't be targeted by Contentstack's per-entry
editable tags the way top-level entries and references can.

- **`navigation`** (new, reusable, multi-entry) — a flat, ordered `links` group
  (`label`/`href`/`open_in_new_tab`). Editors create one entry per menu (e.g. "Main Navigation",
  "Footer - Browse").
- **`header`** (new, singleton by convention) — `logo`, `main_navigation` (reference to one
  `navigation` entry), `cta_label`/`cta_url`, `show_search`/`show_profile` booleans.
- **`footer`** (new, singleton) — `columns` (group of `heading` + a `links` reference to a
  `navigation` entry per column), `legal_text`.
- **`site_config`** slimmed to just `site_name` + `feature_flags`.

**UID/title collision found:** the old `navigation`/`footer` global fields occupied those UIDs
*and* had titles "Navigation"/"Footer" — Contentstack enforces title uniqueness across content
types and global fields together, so creating the new content types 400'd with `"title": ["is not
unique."]` until the old global fields were deleted first (`site_config` had zero entries at the
time, confirmed via `get_all_entries` before deleting — nothing was lost).

`boolean` fields (`show_search`, `show_profile`, `open_in_new_tab`) had zero prior usage in this
stack's model — verified accepted as-is via `get_a_single_content_type` after creation, no quirks
found.

## v2 — structured-content restructure (branch `model_v2`)

Applied on a dedicated Contentstack branch (`model_v2`, cloned from `main`) via
`scripts/migrate-v2.mjs`. `export.json` now reflects this v2 model. Merge to `main` when signed off.

**4 new global fields** (now 6 total): `cta` (label/url/style/open_in_new_tab), `link`
(label/href/open_in_new_tab), `artwork` (hero_image/thumbnail), `title_metadata`
(rating/content_tier/release_date/score, ratings as one shared enum incl. TV-*).

**1 new taxonomy** `content_tags` — 77 governed terms seeded from the catalog's tag vocabulary,
replacing the free-text `content_tags` field on `movie`/`tv_series` (entry field uid `taxonomies`).

**Content-type changes:** `movie`/`tv_series` now embed `title_metadata` + `artwork` + the taxonomy
(tv_series also gains `seo`, previously missing); `hero_banner`/`header`/`page.promo_block` use the
`cta` global field; `navigation.links` is now the `link` global field (multiple); `person.role` is
a multi-select (+`writer`); `site_config.feature_flags` is a `group[]` of `{ key, enabled }`;
`genre` gains `seo`.

**Gotchas found via the live API:**
- Branch UID max length is 15 chars, alphanumeric/underscore only (`content-model-v2` rejected →
  `model_v2`).
- Taxonomy field `max_terms` must be 1–25 (30 rejected).
- **Ordering trap:** removing a field from a content type drops that field's data from existing
  entries. The migration changed schemas *before* reading old values, so `rating`/`content_tags`/
  `artwork`/`cta`/`role`/nav `links` had to be **backfilled from the pristine `main` branch** (entry
  UIDs are identical across a branch clone). Re-run order that avoids this: read entry data first,
  or always backfill from `main`.
- Delivery tokens are **branch-scoped**: the `development` delivery token needed `model_v2` added to
  its branch scope (Settings → Tokens) before the Next.js app could read the branch. Management
  tokens are not permitted to edit delivery-token scopes (401).

**Frontend mapping:** the app's flat types are unchanged; `src/lib/contentstack/normalize.ts`
flattens the nested v2 shapes (`title_metadata`/`artwork`/`taxonomies`/`cta`/`feature_flags`) back
into them, so components did not change. Branch is selected via
`NEXT_PUBLIC_CONTENTSTACK_BRANCH` (see `client.ts`).
