# Navigation content model — validation fix + hardening

## Context

Editing the **Main Navigation** entry in Contentstack fails to save with:

```
Entry update failed.
links.0.href - Use a site-relative path (/browse) or a full URL.
```

The error is not caused by editor input. It is a validation regex that cannot match data
already stored in the stack.

[customize-editor-fields.mjs:221](../scripts/customize-editor-fields.mjs#L221) defines:

```js
const URL_REL = { format: "^(/|https?://).+", error: "Use a site-relative path (/browse) or a full URL." };
```

…and applies it to the `link` global field's `href`
([line 253](../scripts/customize-editor-fields.mjs#L253)). This is confirmed live on the stack.

The trailing `.+` requires **at least one character after** the leading `/`, so `/` on its own
fails. The Main Navigation entry (`blt9f1080921f257782`) is:

```
[0] {"label":"Home","href":"/"}                      ← fails validation
[1] {"label":"Browse","href":"/browse"}
[2] {"label":"Movies","href":"/browse?type=movie"}
[3] {"label":"TV Shows","href":"/browse?type=tv_series"}
```

Those entries were seeded **before** the validation was added. Contentstack only enforces
`format` on save, so the invalid value persists untouched until an editor opens the entry —
then every save fails, on a field they may not have edited.

The same regex is also applied to `cta.url`
([line 247](../scripts/customize-editor-fields.mjs#L247)), so `hero_banner.cta` and
`header.cta` carry the identical latent bug.

### Collateral from the current regex

| Value | Today | Should be |
| --- | --- | --- |
| `/` | ✗ rejected | ✓ accept |
| `#genres` (in-page anchor) | ✗ rejected | ✓ accept |
| `mailto:` / `tel:` | ✗ rejected | ✓ accept |
| `//evil.com` (protocol-relative) | **✓ accepted** | ✗ reject — silently leaves the site |
| `javascript:alert(1)` | ✗ rejected | ✗ reject |

It rejects three legitimate link patterns and permits an off-site redirect.

### Further gaps found

1. **`label` and `href` are both optional** on the `link` global field. A link with neither is
   publishable. An empty `href` flows through
   [normalizeNavLink()](../src/lib/contentstack/normalize.ts#L274-L281) as `""`, and
   `<Link href="">` renders an empty-named link to the current page — a WCAG 2.4.4 failure in
   the primary nav.
2. **`navigation.links` is optional** with no `min_instance`. An empty menu is publishable, and
   the header silently falls back to hardcoded links
   ([header.tsx:14-19](../src/components/layout/header.tsx#L14-L19)) — so the site looks correct
   while the CMS is empty. Broken content that is invisible to the editor.
3. **No referential integrity.** `href` is free text. Renaming a movie slug 404s the nav with
   nothing flagging it.
4. **`link` is doing double duty.** It backs navigation menu items *and* setup_guide doc links
   (`steps.docs_link`, `features.learn_link`, `doc_links.link`). These have genuinely different
   rules — which is why `href` **cannot** simply be made mandatory: doing so would block saving
   setup_guide entries that carry an empty optional link.
5. **[nav.tsx:26](../src/components/layout/nav.tsx#L26) keys on `link.href`.** Two links to the
   same path produce duplicate React keys.
6. **New-tab links lack an a11y affordance in nav.**
   [footer.tsx:83](../src/components/layout/footer.tsx#L83) handles this correctly;
   [nav.tsx](../src/components/layout/nav.tsx) sets `rel="noopener noreferrer"` but no
   "(opens in new tab)" hint — [accessibility.md:113](./accessibility.md#L113) currently claims
   all `target="_blank"` links have one.

## Approach

Fix the regex first so the entry saves (Phase 1, self-contained), then close the modelling gaps
that let the bad state exist in the first place. Phases 1–4 are low risk and address every
concrete defect above. Phase 5 is a separate architectural decision.

---

### Phase 1 — Unblock the save ✅ APPLIED (2026-08-10)

Replace `URL_REL` in [customize-editor-fields.mjs](../scripts/customize-editor-fields.mjs):

```js
const URL_REL = {
  format: "^(/[^/\\\\]\\S*|/|#\\S+|https?://\\S+|mailto:\\S+|tel:\\S+)$",
  error: "Use a site path (/browse, /), an anchor (#genres), a full URL, mailto: or tel:.",
};
```

Verified against 17 cases: accepts `/`, `/browse?type=movie`, `/setup#content-models`,
`#genres`, `mailto:`, `tel:` and full URLs; rejects `//evil.com`, `/\evil.com`, `javascript:`,
bare `browse`, values containing spaces, and the empty string. Deliberately uses **no
lookahead**, for portability across Contentstack's server-side and UI regex engines.

Then re-run `npm run customize-fields` to push it to both `link.href` and `cta.url`. The Main
Navigation entry saves immediately afterwards — **no entry data changes required**.

**Applied result.** A pre-flight audit of all 34 stored values subject to this regex
(`navigation.links[].href`, `setup_guide` step/feature/doc links, `hero_banner.cta.url`,
`header.cta.url`) found 33 already valid, 1 newly valid (`Main Navigation links[0].href = "/"`),
and **0 newly broken**. The CMA accepted the pattern — no error 116. Post-apply verification
re-read the regex from the stack and re-validated all 34 values against it: 0 failures, and
`"/"` now passes. Both `link.href` and `cta.url` carry the identical pattern.

### Phase 2 — Prevent the recurrence ✅ APPLIED (2026-08-10)

The underlying failure was adding validation without checking existing entries against it.

[customize-editor-fields.mjs](../scripts/customize-editor-fields.mjs) gains an `audit` phase that
builds each content type's schema **as it would be after the script runs**, walks it against every
live entry, and reports any stored value the new regex would reject. It is generic — it checks
every field carrying a `format` (slug, hex colour, region codes, canonical_url…), not just the URL
ones.

`fields` now runs the audit as a **pre-flight and aborts (exit 1) before writing** if any live
entry would be left unsaveable; `--force` overrides. Run standalone with
`npm run customize-fields -- audit`.

> **Gotcha worth knowing.** Unlike [export.json](../content-models/export.json), the CMA returns a
> content type's global-field references **without** the schema expanded — just `reference_to`. A
> walker that only recurses into `field.schema` silently skips every global-field subfield,
> `link.href` included. The audit loads global fields separately and grafts the patched schema on.
> The first cut of the audit had this bug and reported a clean stack against the known-broken
> regex; it is now regression-tested by reintroducing the old regex and confirming the abort.

### Phase 3 — Harden the navigation model ✅ APPLIED (2026-08-10)

Split `link` into two global fields so each carries rules that fit its context:

- **`nav_link`** (new — backs `navigation.links`): `label` **mandatory**, `href` **mandatory**,
  `open_in_new_tab` defaulting to `false`.
- **`link`** (unchanged, stays fully optional): continues to serve `setup_guide`.

On the `navigation` content type: `links` is now mandatory with `min_instance: 1`.

One global field cannot be both "a required menu item" and "an optional doc link" — splitting is
the modelling-correct resolution of gap 4. Subfield uids are identical, so **no entry data shape
and no frontend types change**. [content-models/export.json](../content-models/export.json) is
updated alongside the stack, as it is the source of truth for the model.

Implemented by [scripts/split-nav-link.mjs](../scripts/split-nav-link.mjs)
(`backup` → `gf` → `ct` → `restore` → `verify`, idempotent, `--dry` supported).

`nav_link` is **derived from the live `link` schema** so it inherits `URL_REL` rather than
duplicating the regex, and `customize-editor-fields.mjs` carries a `nav_link` block so both stay
in sync on later runs.

> **⚠️ Repointing `reference_to` de-projects the field's data.** Changing
> `navigation.links.reference_to` from `link` to `nav_link` made `links` vanish from every API
> response for all 4 entries — while `_version` stayed at 1 and `updated_at` never moved, i.e. the
> entry documents were untouched but no longer projected through the new field. **The data must be
> written back explicitly**, which is why `restore` is a required step and not a rollback path.
> `backup` runs first and refuses to overwrite a good snapshot with an emptier one, since after
> `ct` the live stack reports zero links until `restore` completes.
>
> Anyone repointing a global-field reference elsewhere in this stack should assume the same
> behaviour and budget for a backup + restore.

Verified: all 15 links across 4 entries restored byte-identical, all 15 `_metadata.uid` values
preserved unchanged (Phase 4 keys off them), and the CDA never stopped serving the published
snapshot — **the live site was unaffected throughout**.

### Phase 4 — Code-side fixes ✅ APPLIED (2026-08-10)

- [nav.tsx](../src/components/layout/nav.tsx): keys on the Contentstack per-item uid
  (`_metadata.uid`, surfaced as `NavLinkItem.uid`) instead of `href`, in both the desktop and
  mobile lists. Falls back to `href-index` if a uid is ever absent.
- [nav.tsx](../src/components/layout/nav.tsx): `open_in_new_tab` links now carry a
  `<span className="sr-only"> (opens in new tab)</span>`, using the same `sr-only` convention as
  the rest of the app. Appending a hidden span keeps the visible label as part of the accessible
  name, unlike an `aria-label` that would replace it — this makes
  [accessibility.md:113](./accessibility.md#L113) true again.
- [normalize.ts](../src/lib/contentstack/normalize.ts): `normalizeNavigation` drops links with an
  empty `label` or `href` rather than coercing to `""`; `normalizeNavLink` carries `_metadata.uid`
  through.
- [types.ts](../src/lib/types.ts): `NavLinkItem` gains an optional `uid`.

Verified: `tsc --noEmit` clean, `next build` green (43 static pages), and the rendered homepage
serves all 4 nav links with `aria-current="page"` on Home and Visual Builder `data-cslp` tags
intact. `npm run lint` reports 4 pre-existing problems, unchanged from `HEAD`.

### Phase 5 — Referential integrity (deferred — needs sign-off)

Add a `link_type` dropdown (`internal` / `external`) to `nav_link`, where `internal` uses a
**reference field** to page-type entries (`page`, `movie`, `tv_series`, `genre`) with the URL
resolved at render time. This is Contentstack's recommended pattern and makes slug renames
non-breaking.

Real cost: a schema change plus a resolver in
[queries.ts](../src/lib/contentstack/queries.ts) and
[normalize.ts](../src/lib/contentstack/normalize.ts). Filter links such as
`/browse?type=movie` do not map to entries, so a free-text escape hatch is still required.

**Recommendation: defer** unless broken nav links become an actual operational pain. Phases 1–4
fix every concrete defect found.

## Status

Phases 1–4 are applied to the stack and the repo. Phase 5 remains an open decision.

### Follow-up for whoever owns publishing

The `restore` step in Phase 3 rewrote the 4 navigation entries, so they now sit at `_version 2`
with **unpublished changes**. The content is byte-identical to what is already published, so
nothing is broken and there is no urgency — but the entries will show as modified in the CMS
until they are republished. Publishing on this stack is workflow-gated, so this is deliberately
left to a human rather than done by a script.

### Re-running these scripts

```bash
npm run customize-fields -- audit     # read-only: does live data satisfy every regex?
npm run customize-fields              # applies field config; aborts if the audit fails
node scripts/split-nav-link.mjs --dry # preview the nav_link migration
node scripts/split-nav-link.mjs       # idempotent; safe to re-run
```
