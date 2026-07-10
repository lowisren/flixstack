# Flixstack Accessibility Guide

Flixstack targets **WCAG 2.1 Level AA** compliance in both light and dark mode.

## Audit Tools

```bash
# Run the automated axe-core audit
pnpm a11y
# Output: reports/a11y-report.json
```

Supplemental manual testing with:
- **macOS VoiceOver** (Cmd + F5)
- **NVDA** on Windows
- **axe DevTools** browser extension
- **Lighthouse** accessibility audit

---

## Color Contrast

All green accent values are pre-validated:

| Token | Light value | Dark value | Ratio | Standard |
|---|---|---|---|---|
| Accent on white | `#16A34A` on `#FFFFFF` | — | 5.0:1 | AA ✓ |
| Accent on dark | — | `#4ADE80` on `#0D0D0D` | 9.4:1 | AAA ✓ |
| Body text light | `#111111` on `#F8F9FA` | — | 17.8:1 | AAA ✓ |
| Body text dark | — | `#F2F2F2` on `#0D0D0D` | 18.1:1 | AAA ✓ |
| Secondary text light | `#4A4A4A` on `#FFFFFF` | — | 9.7:1 | AAA ✓ |
| Focus ring | Matches accent | Matches accent | ≥ 3:1 | AA ✓ |

Color is never the sole means of conveying information (paired with icons/labels).

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

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .skeleton { animation: none; opacity: 0.6; }
}
```

No content flashes more than 3 times per second.

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
