# CMS Editor Experience — Tier 3 Scope (In-context editing & tooling)

Scoping for Tier 3 of [cms-editor-experience-plan.md](cms-editor-experience-plan.md).
Unlike Tiers 1–2 (pure Management-API scripts), Tier 3 spans **three delivery mechanisms**,
and most of it is **not** a one-shot CMA script:

1. **App code** — changes in this Next.js repo (edit tags, rendering).
2. **Stack config** — content-type `url_pattern`s (CMA-scriptable) + Live Preview settings (UI).
3. **UI extensions / apps** — custom fields, sidebar & dashboard widgets. Built as small
   hosted web apps (or inline `srcdoc`) using Contentstack's App SDK, then registered and
   assigned to fields/locations.

This doc scopes each item: mechanism, whether it's scriptable, effort, dependencies, and
value — then a recommended order. **No code is included; nothing here is applied.**

Effort key: **S** ≈ ≤½ day · **M** ≈ 1–3 days · **L** ≈ ~1 week+.

## Summary

| # | Item | Mechanism | Scriptable? | Effort | Value |
|---|---|---|---|---|---|
| 3.1a | Fix content-type `url_pattern`s (preview lands on the right page) | Stack config | ✅ CMA | S | High |
| 3.1b | Live Preview base URL + per-CT start URLs | Stack settings | ⚠️ partial | S | High |
| 3.1c | Click-to-edit tags on modular blocks (`page.sections`) | App code | ❌ | M | High |
| 3.2a | "Where this appears" sidebar widget (`movie`/`tv_series`) | UI extension | ⚙️ register only | M | High |
| 3.2b | SEO preview sidebar widget | UI extension | ⚙️ register only | M | Med |
| 3.2c | "Getting Started" dashboard widget | UI extension | ⚙️ register only | M | Med |
| 3.3a | Colour picker for `genre.color_accent` | Marketplace or field ext | ✅ if Marketplace | S | Med |
| 3.3b | Feature-flag key dropdown (`site_config`) | Field extension | ⚙️ register (srcdoc) | S–M | High |
| 3.3c | Trailer URL preview (`movie.trailer_url`) | Field extension | ⚙️ register (srcdoc) | M | Low–Med |

✅ fully scriptable · ⚙️ registration is scriptable but the UI must be built/hosted first · ⚠️ mostly UI · ❌ app code only

---

## 3.1 Visual Builder / Live Preview

Live Preview + Visual Builder are already wired: `LivePreviewInit` mounts the bridge
([src/components/contentstack/live-preview-init.tsx](../src/components/contentstack/live-preview-init.tsx)),
`createStack()` sets the preview token/host per request
([src/lib/contentstack/client.ts](../src/lib/contentstack/client.ts)), and `normalize.ts`
attaches `data-cslp` edit tags via `addEditableTags`, which components spread as
`{...obj.$?.field}`. Three gaps remain.

### 3.1a — Fix `url_pattern`s  ·  CMA-scriptable  ·  S  ·  BUILT: [`scripts/fix-url-patterns.mjs`](../scripts/fix-url-patterns.mjs)

Run with `pnpm fix-url-patterns all --dry` (preview) then `pnpm fix-url-patterns all`.
Phases: `patterns` (content-type options), `entries` (rewrite stored entry urls), and
`republish` (push the changed entries back to the environments they're already live on).
Idempotent.

**Applied 2026-07-15.** `patterns` + `entries` updated movie (20), tv_series (3), genre (6,
+ new url field, now a page). `republish` succeeded to **development** but is **gated for
production** by the Tier 2 publish rule (`bltca5c8233f137e4ce`) — production republish must
go through the workflow (move to *Ready to Publish* → Reviewer/Admin approves). This is the
governance working as intended; the entries' page routing on the live site is driven by the
Next.js `/watch/[slug]` route regardless, so production is not broken in the meantime.

Today `movie`, `tv_series`, `person`, `page` all have `url_pattern = /:title`, prefix `/`.
The real routes are different, so "Open in Visual Builder" resolves to a 404. Crucially,
the **stored entry `url` values are also wrong** (e.g. movie `/dune-part-two` instead of
`/watch/dune-part-two`), so the script fixes both the content-type options *and* rewrites
existing entry urls (movie 20, tv_series 3, genre 6 — verified via dry-run).

| Content type | Current | Should be | App route |
|---|---|---|---|
| `movie` | `/:title` | prefix `/watch/`, pattern `:slug` | `/watch/[slug]` |
| `tv_series` | `/:title` | prefix `/watch/`, pattern `:slug` | `/watch/[slug]` |
| `page` | `/:title` | pattern `:slug` (or `:url`) | `/[slug]`, `/movie`, `/tv-show` |
| `person` | `/:title` | **excluded** — no standalone route; toggling `is_page:false` fights the existing url field | — |
| `genre` | (not a page) | set `is_page:true`, `/genre/:slug`, **+ add a url field** (genre has none) | `/genre/[slug]` |

`page` entry urls are bespoke (homepage is `/`, not `/homepage`) and already correct, so the
script updates only page's `url_pattern`, not its entries. `person` is excluded from the
script and left as a documented no-op (editors don't preview people; there's no route).

### 3.1b — Live Preview base URL + start URLs  ·  mostly UI  ·  S
Set the preview base URL per environment in **Settings → Live Preview** so the editor
opens the running app. Per-content-type start URLs derive from the `url_pattern`s fixed in
3.1a. Some of this is exposed on the environment object (CMA), but the Live Preview toggle
and base URL are configured in the UI.

### 3.1c — Click-to-edit on modular blocks  ·  app code  ·  M
[src/components/cms/modular-block-renderer.tsx](../src/components/cms/modular-block-renderer.tsx)
tags blocks with non-standard `data-cs-entry` / `data-cs-content-type` attributes, which
the SDK does **not** recognise — so `promo_block` fields (headline, body, CTA) aren't
individually editable in Visual Builder. The `hero`/`rail`/`card` components already do it
right by spreading `{...data.$?.field}`.

Work:
1. In `normalize.ts`, preserve each block's `$` edit-tag map onto the normalized
   `block.data` (the CSLP path for a modular block includes the block index + block uid,
   e.g. `sections.0.promo_block.headline` — `addEditableTags` produces these on the raw
   entry; the flattening step currently drops them for blocks).
2. In the renderer, replace `data-cs-*` with `{...promo.$?.headline}` etc. per field, and a
   block-level tag on the wrapper.
3. Verify in Visual Builder that each promo/spotlight field is click-to-edit.

Dependency: none beyond the existing live-preview setup. Pure repo change + a verify pass.

---

## 3.2 Sidebar & dashboard widgets (UI extensions)

All three are **custom UI extensions**: a small web app (HTML/JS using
`@contentstack/app-sdk`) that renders inside an iframe in the entry sidebar or on the stack
dashboard. Registration is CMA-scriptable (`POST /v3/extensions`, `type: "widget"` or
`"dashboard"`), but the extension's UI must be built and hosted first (or embedded inline
via `srcdoc` for the simplest cases). Recommended: build as a tiny static app, host it
(Launch/Vercel/any static host), then register + assign.

### 3.2a — "Where this appears" (sidebar, `movie`/`tv_series`)  ·  M  ·  High value
Reads the current entry UID, calls the References API
(`get_references_of_an_entry` / `GET /content_types/{ct}/entries/{uid}/references`), and
lists the rails / hero banners / pages that reference this title — so an editor sees the
blast radius before editing. Uses the App SDK for the current-entry context + a delivery/
management call for references.

### 3.2b — SEO preview (sidebar)  ·  M  ·  Med value
Renders a live Google result + social (OG) card from the `seo` global field as the editor
types. Pure client-side; reads field values via the App SDK's entry-field API. Good
companion to the SEO character limits shipped in Tier 1.

### 3.2c — "Getting Started" dashboard widget  ·  M  ·  Med value
A stack-dashboard panel reusing the `setup_guide` content + quick "create movie / series /
rail" links + a publish-queue count (`get_publish_queue`). Lower urgency; nice onboarding.

---

## 3.3 Custom field extensions

**Check the Contentstack Marketplace first** — several of these exist as ready-made apps
(e.g. a Colour Picker), which is install-and-assign rather than build-from-scratch. Build
custom only where no app fits.

### 3.3a — Colour picker for `genre.color_accent`  ·  S
Prefer a Marketplace colour-picker app (install → assign to the field). If none fits, a
`srcdoc` field extension with a native `<input type="color">` writing `#RRGGBB` is ~30 lines
and registrable via CMA. Pairs with the Tier 1 hex validation.

### 3.3b — Feature-flag key dropdown (`site_config.feature_flags.key`)  ·  S–M  ·  High value
Replaces the free-text key (whose typos silently disable features — see Tier 1 note) with a
dropdown of known flag keys. Build as a `srcdoc` field extension; the key list can be
hard-coded initially or read from a config. Highest-value 3.3 item because it removes a
silent failure mode.

### 3.3c — Trailer URL preview (`movie.trailer_url`)  ·  M  ·  Low–Med value
A field extension that validates the URL and renders an inline video thumbnail. Nice-to-have
on top of the Tier 1 URL validation; lowest priority.

---

## Build & deploy mechanics (for the extension items)

- **App SDK:** `@contentstack/app-sdk` (current) initialises the extension inside its
  iframe and exposes the entry, field, and stack context.
- **Registration:** `POST /v3/extensions` with `type` (`field` | `widget` | `dashboard` |
  `rte`), `title`, `scope` (which content types/fields), and either `src` (hosted URL) or
  `srcdoc` (inline HTML — best for tiny self-contained fields like the colour picker).
- **Hosting:** widgets that call APIs are easiest as a small static app on Launch/Vercel;
  trivial fields can be inline `srcdoc`.
- **Marketplace/Developer Hub:** prefer an existing Marketplace app when one covers the need
  (colour picker, advanced URL, etc.) — install and assign, no hosting to maintain.
- **CSP note:** extension iframes run under Contentstack's CSP; keep assets self-contained
  or on the allowed host.

## Scriptable vs. manual, at a glance

- **Scriptable now (CMA):** 3.1a url_patterns; registering any extension once its UI exists.
- **App-code (this repo):** 3.1c modular-block edit tags.
- **Manual (UI / hosting):** 3.1b Live Preview base URL; building + hosting the 3.2 widgets;
  installing Marketplace apps; assigning extensions to fields.

## Recommended sequencing

1. **3.1a + 3.1b** (S, high) — cheapest win; makes "open in Visual Builder" actually work.
2. **3.1c** (M, high) — full click-to-edit on pages; repo change we control end-to-end.
3. **3.3a + 3.3b** (S–M) — colour picker (Marketplace) + feature-flag dropdown (removes a
   silent failure mode).
4. **3.2a** (M, high) — "Where this appears" is the standout editor-confidence widget.
5. **3.2b, 3.2c, 3.3c** (M) — as capacity allows.

The only piece I can turn into a ready-to-run script immediately is **3.1a** (the
`url_pattern` fix). Everything else needs either an app-code change (3.1c) or a built +
hosted extension (3.2/3.3).
