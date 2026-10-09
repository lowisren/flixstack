# Flixstack Accessibility Guide

Flixstack targets **WCAG 2.1 Level AA** compliance in both light and dark mode.

## Audit Tools

Two checks ship with the repo and both exit non-zero on failure, so either can gate CI.

```bash
# 1. axe-core across every route and /design-system, in both themes
npm run dev            # in another terminal (or `npm run build && npm start`)
npm run a11y           # -> reports/a11y-report.json
npm run a11y -- --url=http://localhost:3001

# 2. WCAG contrast guard over the design tokens
npm run check-contrast
npm run check-contrast -- --json
```

[`scripts/a11y.mjs`](../scripts/a11y.mjs) drives headless Chrome over the DevTools Protocol
(via [`scripts/lib/chrome.mjs`](../scripts/lib/chrome.mjs)) — no Selenium or Playwright
dependency, and `axe-core` itself has none. Set `CHROME_PATH` if your browser is somewhere
unusual. It also audits the [design-system catalog](../src/design-system/README.md) at
`/design-system`, which shows every component on its own. That matters because axe can't
compute contrast over a background image, so text on artwork is only checked where the
catalog shows it on a plain ground. With Live Preview on, the script also fails if a catalog
example that renders CMS fields has lost its `data-cslp` edit tags.

[`scripts/check-contrast.mjs`](../scripts/check-contrast.mjs) parses the real token values
out of [tokens.css](../src/design-system/tokens/tokens.css) and checks all 80 shipped pairs,
including on-media text over the media ground. It exists
because this document once asserted the light accent was 5.0:1 on white when it was
actually **3.30:1** — a real WCAG 1.4.3 failure that sat unnoticed precisely because the
number was written by hand. Reverting that token makes the guard fail with 5 errors, so the
check is known to work rather than merely known to pass.

**Current status:** axe-core 4.13.0, 24 runs (12 routes x 2 themes). Every app route is
clean. `/design-system` in light mode has **1 known violation**: the hero-size score on
artwork is 3.25:1. It is a pre-existing defect on the watch page that the catalog exposed;
see the follow-ups in [design-system-plan.md](./design-system-plan.md). Contrast guard:
**80/80 pass**.

ESLint also blocks colours that bypass the tokens (raw palette classes, `white`/`black`,
hex literals), since those would escape both checks.

Manual testing still recommended for what automation cannot judge:
- **macOS VoiceOver** (Cmd + F5) / **NVDA** on Windows — announcement quality and order
- **Windows High Contrast** — `forced-colors` fallbacks
- **Lighthouse** — performance interactions with the texture layer

---

## Color Contrast

> **Corrected in the cyber redesign (PR 1).** The previous version of this table claimed
> `#16A34A` on `#FFFFFF` was 5.0:1. Recomputed, it is **3.30:1** — a genuine WCAG 1.4.3
> failure that affected every light-mode accent link, accent badge, and the entire
> white-on-green primary button. The light accent is now `#0E7038` (6.19:1). Two other
> figures in the old table were also inaccurate (`#4ADE80` on `#0D0D0D` was understated as
> 9.4:1 vs 11.15:1 actual; `#4A4A4A` on `#FFFFFF` was overstated as 9.7:1 vs 8.86:1).

Text pairs must clear **4.5:1** (1.4.3). Control boundaries and focus indicators must clear
**3:1** (1.4.11). Every value below is verified on **all three** surfaces of its theme —
base, surface, and elevated — because a token that passes on white can still fail on the
elevated fill.

### Dark theme — base `#05070A` / surface `#0B0F14` / elevated `#121822`

| Token | Value | base | surface | elevated |
|---|---|---|---|---|
| `--color-text-primary` | `#E6F1F5` | 17.54 | 16.72 | 15.49 |
| `--color-text-secondary` | `#94A9B8` | 8.28 | 7.89 | 7.31 |
| `--color-accent` | `#3DFF9E` | 15.36 | 14.64 | 13.56 |
| `--color-info` | `#22D3EE` | 11.16 | 10.63 | 9.85 |
| `--color-signal` | `#FF4FD8` | 7.07 | 6.74 | 6.24 |
| `--color-premium` | `#FBBF24` | 12.08 | 11.51 | 10.67 |
| `--color-error` | `#FF6B6B` | 7.27 | 6.93 | 6.42 |
| `--color-border-control` (≥3:1) | `#56708A` | 3.92 | 3.73 | 3.46 |

`--color-accent-foreground` `#04120A` on the accent fill: **14.59:1**.

### Light theme — base `#EDF1F2` / surface `#FFFFFF` / elevated `#E1E7E9`

| Token | Value | surface | base | elevated |
|---|---|---|---|---|
| `--color-text-primary` | `#0A1014` | 19.14 | 16.83 | 15.32 |
| `--color-text-secondary` | `#47535C` | 7.90 | 6.94 | 6.32 |
| `--color-accent` | `#0E7038` | 6.19 | 5.44 | 4.95 |
| `--color-info` | `#0B5F76` | 7.21 | 6.34 | 5.77 |
| `--color-signal` | `#86198F` | 8.24 | 7.24 | 6.59 |
| `--color-premium` | `#9A4508` | 6.50 | 5.72 | 5.21 |
| `--color-error` | `#B91C1C` | 6.47 | 5.69 | 5.18 |
| `--color-border-control` (≥3:1) | `#6E7D86` | 4.25 | 3.74 | 3.40 |

`--color-accent-foreground` `#FFFFFF` on the accent fill: **6.19:1**.

`--color-text-disabled` is the one token held only to 3:1 (3.42 dark / 3.55 light on
elevated). **It is for decorative `aria-hidden` icons and genuinely disabled controls only
— never for text a sighted user is expected to read.** WCAG 1.4.3 exempts inactive
components, not quiet ones. Using it for card genre names produced 231 axe violations at
3.41:1 (finding 8 below); real-but-secondary content takes `--color-text-secondary`.

### Two kinds of border

`--color-border` is **decorative** (dividers, card edges) and is exempt from 1.4.11.
`--color-border-control` is for anything whose boundary identifies a control — inputs,
buttons, toggles — and clears 3:1 on every surface. Do not use the decorative token on a
control: the search input previously did, at roughly 1.3:1.

Color is never the sole means of conveying information (paired with icons/labels).

### Focus indicators on notched elements

`clip-path` clips an element's `outline`, and `overflow: hidden` on an ancestor clips a
descendant's outline. Elements carrying the `.notch` / `.notch-sm` HUD geometry therefore
take their focus indicator as an **inset `box-shadow`**, which is clipped with the shape and
stays visible.

That ring is deliberately **two-tone** — an inner band in `--color-bg-base` and an outer
band in `--color-focus-ring`. A single-tone ring is invisible on the primary button, whose
fill *is* the accent colour. With two bands, whichever way the fill goes, one always
contrasts: the ground band carries it on accent/error fills, the accent band carries it on
surface, elevated, and transparent fills.

Buttons use `transition-colors`, not `transition-all`, so the focus ring appears
immediately instead of fading in over 150ms.

---

## Keyboard Navigation

- **Tab order** follows visual reading order on all pages
- **Skip to main content** link is the first focusable element on every page
- **Rails** support `ArrowLeft`/`ArrowRight` for horizontal scrolling
- **Hero carousel** pause/prev/next are keyboard accessible
- **Mobile nav** can be opened/closed with Enter/Space
- **Season accordions** use native `<details>`/`<summary>`
- **Dropdowns and selects** use native `<select>` for full keyboard support

Every focusable element has a visible focus indicator. Verified by focusing each one in turn
and asserting a non-`none` `outline` or `box-shadow` (or an inset ring on its notched
ancestor): **414 focusable elements across 7 routes, 0 without an indicator.**

The rail edge fade is disabled on `:focus-within`, because a CSS mask clips painting and
would otherwise fade out the focus ring of a card scrolled to the boundary.

## Reflow and Zoom

- **320px reflow** (WCAG 1.4.10): verified on all routes with no horizontal overflow. This
  needed three fixes — see items 13–15 above.
- **200% zoom** (WCAG 1.4.4): verified on all routes with no overflow or clipping.
- Uppercase and letter-spacing are applied with `text-transform`/`letter-spacing`, never by
  changing the source string, so assistive tech reads normal-case text and WCAG 1.4.12
  text-spacing overrides do not break headings.

## Semantic HTML

| Component | Element(s) used |
|---|---|
| Page wrapper | `<main id="main-content">` |
| Navigation | `<nav aria-label="Main navigation">` |
| Content sections | `<section aria-label="…">` |
| Article cards | `<article>` |
| Definition lists | `<dl>`, `<dt>`, `<dd>` (title metadata) |
| Episode accordion | `<details>` / `<summary>` |
| Footer | `<footer role="contentinfo">` |
| Header | `<header role="banner">` |

---

## ARIA Usage

| Pattern | ARIA attributes |
|---|---|
| Theme toggle | `aria-label` changes to reflect new mode |
| Hero dots | `role="tablist"`, `role="tab"`, `aria-selected` |
| Rail controls | `aria-label="Scroll [Rail Name] left/right"` |
| CS Inspector panel | `role="dialog"`, `aria-modal="true"`, `aria-label` |
| Filter toggles | `aria-pressed` on toggle buttons |
| Content type radios | `role="radiogroup"`, `role="radio"`, `aria-checked` |
| Profile switches | `role="switch"`, `aria-checked` |
| Loading spinner | `aria-busy="true"` on button, `aria-live` region |
| Search results | `aria-live="polite"`, `aria-atomic="true"` |
| Reduce-effects toggle | `role="switch"`, `aria-checked` |
| Avatar status dot | `role="img"` + `aria-label` (an `aria-label` on a bare `div` is prohibited) |
| Loading skeletons | one `role="status"` per *group*, not per placeholder |

---

## Motion

All animations respect `prefers-reduced-motion`. The blanket duration override is kept for
inherited transitions, but it is **not sufficient on its own**: forcing a directional
keyframe (a sweep, a glitch) to `0.01ms` freezes it at an arbitrary offset and can leave an
element visibly displaced. So every named animation also gets an explicit `animation: none`
plus a defined safe static state:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }

  .skeleton { opacity: 0.6; }
  .skeleton::after { animation: none !important; display: none; }
  .terminal-caret::after { animation: none !important; opacity: 1; }
  .chromatic:hover, .chromatic:focus-visible { text-shadow: none; }
}
```

No content flashes more than 3 times per second. The fastest repeating element on the site is
the terminal caret at **~0.94 Hz**, and it is a single character block — well under the
"large flash" area threshold of WCAG 2.3.1.

### Texture is gated at the token level

Scanlines, grain, the wireframe grid, glow, and the chromatic fringe are all driven by CSS
custom properties (`--scanline-opacity`, `--grain-opacity`, `--grid-opacity`, `--glow-*`,
`--fx-chromatic`). The `.reduce-fx` class on `<html>` zeroes them all, so texture switches
off everywhere at once and no effect can escape the gate. Components must never hardcode an
opacity, glow, or shadow that bypasses these tokens.

`.reduce-fx` is a *user preference* (its UI ships in PR 5) and never a substitute for
`prefers-reduced-motion` — the OS setting works independently and always wins.

### Other media queries honoured

- `@media (forced-colors: active)` — Windows High Contrast drops `box-shadow` entirely, so
  notched shapes and glow-only affordances are replaced with real `CanvasText` borders and
  a `Highlight` outline, and decorative overlays are hidden.
- `@media (prefers-contrast: more)` — texture opacities drop to 0 and `--color-border` is
  promoted to the stronger control colour.

---

## Forms & Inputs

All inputs in Flixstack (search, profile preferences) have:
- A visible, associated `<label>` or `aria-label`
- `focus-visible` styling
- `aria-describedby` for any helper text
- Error announcements via `aria-live` regions

---

## Defects Found and Fixed

Recorded because several were invisible to inspection and only surfaced under measurement.
Every ratio below was measured on rendered pixels, not modelled.

| # | Defect | Was | Now |
|---|---|---|---|
| 1 | Light accent `#16A34A` failed AA — affected all accent text, accent badges and the whole white-on-green primary button | 3.30:1 | 6.19:1 (`#0E7038`) |
| 2 | Light-mode `error` and `premium` fell below 4.5:1 on the elevated surface | 3.87 / 4.02:1 | 5.18 / 5.21:1 |
| 3 | Search input drew its only affordance with the *decorative* divider colour (WCAG 1.4.11) | ~1.3:1 | 3.73:1 (`--color-border-control`) |
| 4 | Theme toggle read `theme` not `resolvedTheme`, so with `enableSystem` it announced the wrong mode to screen readers while rendering the other one | wrong `aria-label` | correct in all 4 setting/OS combinations |
| 5 | Hero bottom vignette used `from-background` behind `text-white`, so in light mode the title faded into a near-white ground. Same bug on `/watch/[slug]` and `/genre/[slug]` | 1.12:1 | 16.92 / 13.71:1 (title / subtitle) |
| 6 | Genre hero put theme-coloured text on an editor-chosen `color_accent` tint, so contrast depended on a CMS field. A light accent (`#FDE047`) computed to 3.40:1 | 4.61:1 measured | 16.27:1, independent of the field |
| 7 | Title card hover overlay was `aria-hidden` but held a focusable watchlist button (axe `aria-hidden-focus`); keyboard users could focus an invisible control | violation | overlay reveals on `focus-within` |
| 8 | `--color-text-disabled` (3.41:1) was used for genre names and other real content, not just disabled controls | 231 axe violations | `--color-text-secondary` (7.31:1); the token is now icons-only |
| 9 | Inline links in prose were distinguished by colour alone (WCAG 1.4.1) | 13 violations | always underlined |
| 10 | `aria-label` on a `div` with no role (avatar status dot) | violation | `role="img"` |
| 11 | `getRatingColor` returned raw Tailwind palette classes bypassing the tokens, and failed contrast | 3.73:1 | design tokens, all >= 4.5:1 |
| 12 | Tailwind v4's `dark:` variant keys off `prefers-color-scheme`, but this app themes with a `.dark` class — so `dark:` utilities tracked the OS, not the app | silent mismatch | `@custom-variant dark` |
| 13 | Portrait `TitleCard`s in responsive grids kept their fixed 160px width, overflowing a 320px viewport (WCAG 1.4.10) | 328px min | reflows to 320px |
| 14 | `/setup` prose could not break long env-var names at 320px | 419px min | `break-words` |
| 15 | Header wordmark in display caps pushed the header past 320px | 349px min | wordmark hides below `sm` |

Two regressions were introduced *during* the redesign and caught the same way:

- A `position` declared in an unlayered utility class silently overrode Tailwind's
  positioning utilities (unlayered CSS beats `@layer utilities` regardless of specificity).
  This turned the sticky header into `position: relative`, and separately collapsed the
  hero scrim to **0px tall** so it painted nothing. No utility declares `position` any
  more — see the CASCADE RULE note in
[`effects.css`](../src/design-system/tokens/effects.css).
- The reduce-effects preference silently failed on the 404 route, which renders its shell
  on the client where inline scripts in React components never execute.

## Known Patterns to Watch

1. **Image `alt` text** — Hero backgrounds use `alt=""` (decorative). Thumbnail images include the title name.
2. **Icon-only buttons** — Every icon-only control has an explicit `aria-label`.
3. **External links** — `target="_blank"` links include `(opens in new tab)` in their `aria-label`.
4. **`<details>` accordion** — Supported by all modern screen readers. VoiceOver on iOS requires iOS 15+.
