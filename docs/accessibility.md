# Flixstack Accessibility Guide

Flixstack targets **WCAG 2.1 Level AA** compliance in both light and dark mode.

## Audit Tools

> ⚠ **There is no `npm run a11y` script yet.** This doc previously documented one
> (writing `reports/a11y-report.json`), but no such script or axe dependency exists in
> `package.json`. Verification is currently **manual**, plus the contrast computation
> described below. Adding a real automated audit is PR 6 of the cyber redesign — see
> [cyber-redesign-plan.md](./cyber-redesign-plan.md).

Contrast ratios in this doc are computed with the WCAG relative-luminance formula rather
than eyeballed. Every pair in the table below has been verified against the shipped tokens
in [globals.css](../src/app/globals.css).

Manual testing with:
- **macOS VoiceOver** (Cmd + F5)
- **NVDA** on Windows
- **axe DevTools** browser extension
- **Lighthouse** accessibility audit

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
elevated) and is therefore restricted to non-essential text.

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
- **Mobile nav** can be opened/closed with Enter/Space and dismissed with Escape
- **Modals / panels** (e.g., CS Inspector) trap focus correctly and return focus on close
- **Dropdowns and selects** use native `<select>` for full keyboard support

---

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

## Known Patterns to Watch

1. **Image `alt` text** — Hero backgrounds use `alt=""` (decorative). Thumbnail images include the title name.
2. **Icon-only buttons** — Every icon-only control has an explicit `aria-label`.
3. **External links** — `target="_blank"` links include `(opens in new tab)` in their `aria-label`.
4. **`<details>` accordion** — Supported by all modern screen readers. VoiceOver on iOS requires iOS 15+.
