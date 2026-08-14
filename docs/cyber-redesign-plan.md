# Cyber redesign — *Hackers* / *Strange Days* / *eXistenZ*

> **Status:** direction approved. All five open decisions are resolved — see
> [Decisions (resolved)](#decisions-resolved) and [Delivery sequence](#delivery-sequence).
> **Branch:** all work lands on `feat/cyber-redesign`; nothing is committed to `main`.

## Context

Flixstack's visual system lives almost entirely in two places:

- [globals.css](../src/app/globals.css) — a flat CSS custom-property token set (`:root` for light,
  `.dark` for dark), bridged into Tailwind v4 utilities via `@theme inline`.
- Components consume tokens through arbitrary-value classes — both spellings are in use today:
  `bg-[var(--color-bg-surface)]` (older, in [header.tsx](../src/components/layout/header.tsx),
  [rail.tsx](../src/components/streaming/rail.tsx)) and the Tailwind v4 shorthand
  `text-(--color-text-primary)` / bare aliases `bg-elevated`, `text-accent` (newer, in
  [title-card.tsx](../src/components/streaming/title-card.tsx), [page.tsx](../src/app/page.tsx)).

Theme switching is `next-themes` with `attribute="class"`, `defaultTheme="system"`
([providers.tsx](../src/components/layout/providers.tsx)).

**This is good news for a redesign**: most of the visual change can land in `globals.css` as token
re-tuning, and every component that reads tokens updates for free. The per-component work is
geometry, typography, and texture — not colour plumbing.

### Why it currently reads as dated (the actual diagnosis)

1. **One radius, everywhere.** `rounded-lg` on cards, buttons, badges, panels, avatars. No shape
   hierarchy, so nothing feels engineered — it reads as a 2019 Bootstrap/Netflix-clone default.
2. **Palette carries no brand.** Neutral grays plus a single utility green. The green is used for
   accents, success, *and* focus ring, so it never means anything specific.
3. **Zero depth or texture.** No shadow tokens, no glow, no grain, no film. Every surface is a flat
   fill separated only by a 1px `#e5e7eb` / `#2e2e2e` line.
4. **`--font-mono` is loaded and almost unused.** Geist Mono ships on every page and is referenced
   in exactly one place — `Badge variant="rating"`. A monospace voice is the cheapest, most
   on-theme typographic win available and it's already paid for.
5. **Motion is one gesture.** `hover:scale-105` on cards and opacity fades. Nothing responds to
   focus differently than hover; nothing has a state that feels *live*.
6. **Hero scrim is two plain black gradients** ([hero.tsx:63-70](../src/components/streaming/hero.tsx#L63-L70)),
   which flattens whatever artwork the CMS supplies.

### Two pre-existing accessibility defects this redesign must fix

I recomputed every ratio asserted in [accessibility.md](./accessibility.md). Some are wrong, and one
is a real WCAG failure shipping today:

| Claim in `accessibility.md` | Documented | **Actual** | Verdict |
|---|---|---|---|
| `#16A34A` on `#FFFFFF` | 5.0:1 AA ✓ | **3.30:1** | ❌ **fails AA for normal text** |
| `#4ADE80` on `#0D0D0D` | 9.4:1 AAA ✓ | 11.15:1 | ✓ (doc understates) |
| `#111111` on `#F8F9FA` | 17.8:1 | 17.91:1 | ✓ |
| `#4A4A4A` on `#FFFFFF` | 9.7:1 | 8.86:1 | ✓ (doc overstates) |

**The live defect:** light mode's `--color-accent: #16A34A` is 3.30:1 on white. That means, in light
mode today, every `text-accent` link, every `Badge variant="accent"` label, and the **entire primary
button** (white-on-green, also 3.30:1) fails WCAG 1.4.3 for normal-size text. Fixing this is
in-scope Phase 1 work, not a follow-up.

Also: `accessibility.md` documents `npm run a11y` → `reports/a11y-report.json`, but **no `a11y`
script exists** in [package.json](../package.json) and there's no axe dependency. Verification is
currently manual-only. Phase 8 addresses this.

---

## Aesthetic direction

The three references pull in genuinely different directions, which is useful — taking one ingredient
from each avoids a pastiche of any single one.

| Film | What we take | What we deliberately *don't* take |
|---|---|---|
| **Hackers** (1995) | Phosphor-green-on-black terminal voice; CRT scanlines; isometric wireframe grid as backdrop; wide-letterspaced mono caps for labels; the cyan↔magenta iridescence of the "Gibson" sequences | Literal 3D chrome extrusions, rollerblades-era clip art, rainbow gradients on text |
| **Strange Days** (1995) | Night-city grime; chromatic fringing (a 1px cyan/magenta offset) on hover/active states; blown-out amber-red highlights against blue-black; the sense of a *recording* being played back | Full VHS tracking distortion, heavy blur, anything that degrades legibility of poster art |
| **eXistenZ** (1999) | A warm bone/ochre counterpoint so the palette isn't only cold neon; muted rather than luminous; soft pod curves on a *few* elements to break the grid | Fleshy/organic textures, biological imagery |

### The governing guardrail

**Flixstack is a streaming product — the artwork is the hero.** Every effect below is confined to
*chrome*: panel edges, labels, backdrops, empty states, focus and hover states. Nothing overlays
poster art or body copy. This is both a design principle and the accessibility strategy: if texture
never touches text, text contrast stays computable.

---

## Phase 1 — Token foundation (`globals.css`)

The structural change: today's token set is one accent plus neutrals. The new set is **three
signal hues** (phosphor green = primary/interactive, cyan = informational/data, magenta = alert or
"live"), a **warm** hue (amber, already present as `--color-premium` — promoted to a first-class
accent), plus shape, glow, and texture tokens.

### Dark palette (the primary theme)

All ratios below are computed, not estimated.

| Token | Value | Ratio | Against |
|---|---|---|---|
| `--color-bg-base` | `#05070A` | — | — |
| `--color-bg-surface` | `#0B0F14` | — | — |
| `--color-bg-elevated` | `#121822` | — | — |
| `--color-text-primary` | `#E6F1F5` | **17.54:1** AAA | base |
| `--color-text-secondary` | `#94A9B8` | **8.28:1** AAA / 7.31:1 on elevated | base / elevated |
| `--color-text-disabled` | `#5C6F7E` | 3.42:1 | elevated (non-essential text only) |
| `--color-accent` (phosphor) | `#3DFF9E` | **15.36:1** AAA / 13.56:1 on elevated | base / elevated |
| `--color-accent-foreground` | `#04120A` | **14.59:1** | on accent fill |
| `--color-info` (cyan) | `#22D3EE` | **11.16:1** / 9.85:1 on elevated | base / elevated |
| `--color-signal` (magenta) | `#FF4FD8` | **7.07:1** / 6.24:1 on elevated | base / elevated |
| `--color-premium` (amber) | `#FBBF24` | **12.08:1** | base |
| `--color-error` | `#FF6B6B` | **7.27:1** | base |
| `--color-border` (decorative) | `#1E2A38` | 1.39:1 | base — dividers only, WCAG 1.4.11 exempt |
| `--color-border-control` **(new)** | `#56708A` | **3.92 / 3.73 / 3.46:1** | base / surface / elevated — passes 3:1 on *all three* |
| `--color-focus-ring` | `#3DFF9E` | **15.36:1** | base |

The `--color-border-control` token is the fix for a gap that exists today: inputs like the
[search field](../src/app/search/page.tsx#L60) use `border-border` (`#2e2e2e`, ~1.3:1), so the
control's boundary — its only affordance — fails WCAG 1.4.11. Splitting decorative from control
borders resolves it without making every divider shout.

### Light palette ("daylight terminal")

Cyber is dark-native, so light mode becomes a deliberately plainer variant: same geometry and
typography, texture dialled to near-zero, hues darkened until they pass on paper.

| Token | Current | **New** | Ratio (white / base `#EDF1F2` / elevated `#E1E7E9`) |
|---|---|---|---|
| `--color-bg-base` | `#f8f9fa` | `#EDF1F2` | — |
| `--color-text-primary` | `#111111` | `#0A1014` | 19.14 / **16.83** / — |
| `--color-text-secondary` | `#4a4a4a` | `#47535C` | 7.90 / **6.94** / 6.32 |
| `--color-accent` | `#16a34a` ❌ 3.30 | **`#0E7038`** | 6.19 / **5.44** / — ✓ |
| `--color-accent-foreground` | `#ffffff` | `#FFFFFF` | **6.19:1 on fill** ✓ (was 3.30 ❌) |
| `--color-info` | — | `#0B5F76` | 7.21 / 6.34 / **5.77** |
| `--color-signal` | — | `#86198F` | 8.24 / 7.24 / **6.59** |
| `--color-premium` | `#d97706` | `#9A4508` | 6.50 / 5.72 / **5.21** |
| `--color-error` | `#dc2626` (3.87 on elevated ❌) | **`#B91C1C`** | 6.47 / 5.69 / **5.18** ✓ |
| `--color-border-control` | — | `#6E7D86` | 4.25 / **3.74** / 3.40 ✓ |

Every light value clears 4.5:1 on *all three* light surfaces — the current set does not (today's
`#dc2626` error is 3.87:1 on elevated, and `#d97706` premium is 4.02:1).

### Shape tokens (new)

Replaces the uniform `rounded-lg`. Registered in `@theme inline` as `--radius-*` so Tailwind
generates `rounded-panel`, `rounded-control`, `rounded-chip` utilities and we stop hardcoding.

| Token | Value | Used by |
|---|---|---|
| `--radius-panel` | `2px` | Cards, hero, surfaces — near-square HUD panels |
| `--radius-control` | `3px` | Buttons, inputs, rail arrows |
| `--radius-chip` | `1px` | Badges, genre pills |
| `--radius-pod` | `999px` | The *few* eXistenZ curved elements (avatar, play FAB, hero dots) |
| `--notch` | `10px` | Corner-cut size for `clip-path` HUD panels |

### Glow, grid & grain tokens (new)

```
--glow-accent, --glow-info, --glow-signal   /* layered box-shadows, decorative only */
--shadow-panel                               /* replaces the current no-shadow flatness */
--grid-line                                  /* wireframe backdrop line colour */
--scanline-opacity: 0.035                     /* hard ceiling — see accessibility contract */
--grain-opacity: 0.025
```

### The `.reduce-fx` escape hatch — established here, in Phase 1

The user-facing "reduce effects" toggle (approved, Q4) ships in Phase 7, but its **gating
convention must exist before any effect is authored** — otherwise every effect written in Phases
3–7 needs retrofitting. So Phase 1 defines the contract, mirroring the existing root-class patterns
(`.dark`, `.cs-inspect-active`):

```css
.reduce-fx {
  --scanline-opacity: 0;
  --grain-opacity: 0;
  --glow-accent: none;
  --glow-info: none;
  --glow-signal: none;
}
```

Gating at the **token** level rather than per-selector means texture switches off everywhere at
once and no effect can accidentally escape it. Only keyframe animations need a second rule
(`.reduce-fx` sets `animation: none` plus the same safe static states Phase 8 defines for
`prefers-reduced-motion` — the two paths share one implementation).

**Rule for Phases 3–7: no effect may hardcode an opacity, glow, or colour that bypasses these
tokens.** That is what makes the toggle a one-line switch instead of an audit.

---

## Phase 2 — Typography

Three roles instead of one. Body copy stays a humanist sans for readability — this is the main
accessibility concession and it is not negotiable.

| Role | Face | Why |
|---|---|---|
| **Display** — h1/h2, hero title, rail headings | **Chakra Petch** (600/700), uppercase, `letter-spacing: 0.04em` | Squared-off techno face with real legibility; carries *Hackers* without novelty-font cost |
| **Body** — paragraphs, descriptions, form text | **Geist Sans** (unchanged) | Already loaded; keeps reading comfortable at length |
| **Data** — badges, runtime, scores, year, metadata, timestamps, counts | **Geist Mono** (already loaded, currently near-unused) | Terminal-readout voice; zero new bytes |

Verified against this Next version's font manifest — `Chakra Petch` resolves via
`next/font/google` with weights 300–700. Wired in [layout.tsx](../src/app/layout.tsx) exactly like
the existing Geist calls (`variable: "--font-display"`), then mapped in `@theme inline` as
`--font-display`. Confirmed against `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
— the `variable` + `className` pattern is unchanged in Next 16.

**Decided (Q2): Chakra Petch.** Load **only weights 600 and 700** with `subsets: ["latin"]` and
`display: "swap"` — it's a display face used for headings and short labels, so the 300/400/500
weights are dead payload. That keeps the added cost to two subsetted woff2 files, self-hosted by
`next/font` with no external request and no layout shift.

**Accessibility constraints on the display face:**
- Uppercase + tracking applies to headings and short labels **only** — never to sentences or
  paragraphs (screen-reader and dyslexia cost).
- Uppercase is applied with `text-transform`, not by changing the source string, so assistive tech
  reads normal-case text.
- Must hold at 200% zoom and survive WCAG 1.4.12 text-spacing overrides — headings get `text-wrap:
  balance` and no fixed heights.

---

## Phase 3 — Primitives

[button.tsx](../src/components/ui/button.tsx), [badge.tsx](../src/components/ui/badge.tsx),
[skeleton.tsx](../src/components/ui/skeleton.tsx), plus new CSS utility classes in `globals.css`.

- **Button** — keep the existing `variant`/`size`/`asChild` API exactly as-is; restyle only the
  class strings. `primary` becomes phosphor fill with a bracket-notch `clip-path`; `outline`
  becomes a hairline `--color-border-control` box with an inner glow on hover; add a `terminal`
  variant (mono, uppercase, `[` `]` bracket affordance via pseudo-elements).
- **Badge** — add `info` and `signal` variants alongside `default`/`accent`/`premium`/`rating`/`outline`;
  all switch to mono + `--radius-chip`.
- **Skeleton** — replace the opacity pulse with a scanline sweep (single direction, 1.8s, no flash).
- **New utilities** (`globals.css`, alongside the existing `.scroll-rail` / `.skeleton` pattern):
  `.panel-notch`, `.grid-backdrop`, `.scanlines`, `.grain`, `.glow-accent`, `.chromatic-hover`,
  `.terminal-caret`.

### ⚠ Known technical trap: `clip-path` clips focus rings

`clip-path` clips an element's **outline**, and `overflow: hidden` on an ancestor clips a
descendant's outline. Corner-notched panels would therefore silently destroy the `:focus-visible`
ring that [globals.css:121](../src/app/globals.css#L121) provides globally — an accessibility
regression that looks like nothing at all in a screenshot.

**Mitigation, applied consistently:** notched elements get their focus indicator as an inset
`box-shadow` ring (which is clipped *with* the shape, staying visible) rather than `outline`, or the
notch moves to a pseudo-element sibling while the focusable element stays unclipped. This is
resolved once here in Phase 3 so Phases 4–6 inherit it. Same trap already applies to
`.cs-inspect-active [data-cs-entry]`'s dashed outline
([globals.css:208](../src/app/globals.css#L208)) — the Live Preview inspector must keep working.

---

## Phase 4 — Chrome

[header.tsx](../src/components/layout/header.tsx), [nav.tsx](../src/components/layout/nav.tsx),
[footer.tsx](../src/components/layout/footer.tsx),
[site-chrome.tsx](../src/components/layout/site-chrome.tsx),
[theme-toggle.tsx](../src/components/layout/theme-toggle.tsx).

- Header: hairline phosphor underglow instead of a flat border; nav links get mono uppercase +
  animated underscore-caret on the active route; logo mark becomes a notched square.
- Footer: wireframe grid backdrop at low opacity; column headings in mono caps; a `> built with
  contentstack` terminal-prompt line replacing the current plain text.
- Theme toggle: swap icons for a `[ DAY ]`/`[ NIGHT ]` mono readout (keeps icon + text, so it isn't
  colour-only). See the defect below — this one is *not* class-strings-only.
- **Regression watch:** the fallback nav/footer arrays and all CMS-driven props stay untouched.
  Apart from the two theme fixes below, this phase is class strings only.

### Dark becomes the default (Q1) — and a bug it exposes

[providers.tsx](../src/components/layout/providers.tsx) changes `defaultTheme="system"` →
`defaultTheme="dark"`, keeping `enableSystem` so **System stays selectable** — a first-time visitor
gets the intended dark aesthetic, and anyone who explicitly wants light or system still gets it.

That change exposes a **live bug** in [theme-toggle.tsx](../src/components/layout/theme-toggle.tsx#L16):

```tsx
const { theme, setTheme } = useTheme();
const isDark = theme === "dark";   // ❌ `theme` is "system" whenever System is selected
```

With `enableSystem`, `theme` holds the *setting* (`"system"`), not the active theme. So a visitor on
a dark OS today sees dark chrome while the toggle renders the Moon icon and announces
**"Switch to dark mode"** — wrong icon, and a wrong `aria-label` read aloud by screen readers. The
fix is `resolvedTheme` (confirmed present in `next-themes` 0.4.6's `useTheme` return type):

```tsx
const { setTheme, resolvedTheme } = useTheme();
const isDark = resolvedTheme === "dark";
```

Small fix, real accessibility bug, and it gets worse once dark is the default — so it lands here
rather than as a follow-up.

## Phase 5 — Streaming surfaces

[hero.tsx](../src/components/streaming/hero.tsx), [rail.tsx](../src/components/streaming/rail.tsx),
[title-card.tsx](../src/components/streaming/title-card.tsx),
[video-player.tsx](../src/components/streaming/video-player.tsx).

- **Hero** — replace the two flat black gradients with a three-layer scrim (blue-black base +
  bottom vignette + faint scanlines), a corner HUD frame, and the title in display caps with a
  1px chromatic offset. Scrim floor computed: white-on-`#0D1014` = **19.07:1**, and even at the
  gradient's lightest sampled midpoint (`#26303B`) white holds **13.39:1** — so hero copy stays AA
  regardless of the artwork the CMS supplies. Carousel dots keep `role="tablist"`, auto-rotate keeps
  its hover-pause.
- **Title card** — notched panel, mono metadata row, phosphor score readout, and a scan-sweep on
  hover instead of `scale-105` (cheaper to paint across a full rail). Existing badge slots, hover
  play/add controls, and `data-cs-entry` hooks unchanged.
- **Rail** — heading in display caps with a `//` prefix; arrow buttons become notched squares;
  a subtle edge-fade mask at the scroll boundaries. `ArrowLeft`/`ArrowRight` keyboard handling and
  `role="list"`/`listitem` semantics preserved.
- **Video player** — stays a native `<video>` with `controls`; only the poster frame and its
  container chrome change. **No custom control UI** — native controls are the accessible default and
  replacing them is out of scope.

## Phase 6 — Page passes

[browse-client.tsx](../src/app/browse/browse-client.tsx),
[search/page.tsx](../src/app/search/page.tsx),
[watch-content.tsx](../src/app/watch/[slug]/watch-content.tsx),
[profile-client.tsx](../src/app/profile/profile-client.tsx),
[genre/[slug]/page.tsx](../src/app/genre/[slug]/page.tsx),
[setup/page.tsx](../src/app/setup/page.tsx), [not-found.tsx](../src/app/not-found.tsx),
[page.tsx](../src/app/page.tsx), [modular-block-renderer.tsx](../src/components/cms/modular-block-renderer.tsx).

Mostly mechanical once Phases 1–3 land. The ones with actual design work:

- **Search** — the biggest opportunity. Becomes a terminal query line: `> ` prompt, blinking caret,
  mono result count as `[ 14 MATCHES ]`, and a "no signal" empty state. All existing
  `aria-live`/`aria-controls`/`aria-describedby` wiring
  ([search/page.tsx:77-87](../src/app/search/page.tsx#L77-L87)) preserved verbatim.
- **Browse** — filter pills become notched toggles; keep `aria-pressed` / `role="radiogroup"`.
- **Not-found** — a *Strange Days* "signal lost" glitch panel. Best single showcase of the
  aesthetic at zero UX risk.
- **Setup** — deliberately restrained; it's developer documentation and must stay readable.
  (Note: its copy is CMS-seeded — see the `/setup` content notes before touching strings.)
- **Home `FeatureCallouts`** — currently the most generic block on the site; becomes a mono
  "system modules" readout.

## Phase 7 — Motion & texture layer

Global, additive, and gated. Each effect ships with an explicit reduced-motion static state.

| Effect | Where | Trigger | Duration |
|---|---|---|---|
| Scanline overlay | Body backdrop, hero, empty states | Always (static, no animation) | — |
| Wireframe grid | Footer, empty states, `/setup` | Static | — |
| Grain | Body, ≤2.5% opacity | Static | — |
| Chromatic fringe | Headings, card titles | `:hover` / `:focus-visible` | 120ms, single-shot |
| Scan sweep | Card hover, skeleton loading | `:hover` / loading | 400ms / 1.8s loop |
| Terminal caret | Search input, footer prompt | Always | 1.06s blink (**~0.94 Hz**) |
| Glitch displacement | `not-found` only | Mount, plays 3× then stops | 3 × 180ms |

**Every animation above is under 3 flashes/second (WCAG 2.3.1).** The caret blink at ~0.94 Hz is the
fastest repeating element on the site, and it's a 1-char block, well under the "large flash" area
threshold.

### The "reduce effects" toggle (Q4 — approved)

Consumes the `.reduce-fx` contract established in Phase 1, so this phase is only persistence plus UI.

**Where it lives:** primary control in **profile preferences**, reusing the existing
`role="switch"` / `aria-checked` pattern already documented for that page in
[accessibility.md](./accessibility.md), plus a mirrored control in the footer for discoverability.
Deliberately **not** in the header — it's already tight on mobile, and this is a set-once
preference, not a frequent action.

**Persistence — recommended: a cookie read server-side.** `layout.tsx` is already an `async` Server
Component awaiting three CMS fetches, so it can read the cookie and stamp `class="reduce-fx"` onto
`<html>` during render. That means **no un-styled flash and no blocking inline script** — strictly
better than the `localStorage` + inline-script dance `next-themes` has to do.

⚠ Reading cookies opts a route into dynamic rendering. Before implementing, check the current
caching/dynamic-API rules in `node_modules/next/dist/docs/01-app/` — per
[AGENTS.md](../AGENTS.md), this Next version's behaviour here may differ from what I'd assume, and
it's the one part of this plan I won't design blind. If it turns out to force an unacceptable
rendering change, fall back to `localStorage` + a small pre-hydration script mirroring how
`next-themes` already does it in this app.

**Accessibility requirements for the toggle itself:**
- It is a *preference*, never a replacement for `prefers-reduced-motion` — the OS setting keeps
  working independently, and OS-reduced-motion always wins regardless of the toggle's state.
- Labelled with text, not an icon alone; state carried by `aria-checked`, not by colour.
- Turning it on must not shift layout — effects are opacity/shadow only, never geometry.

**Out of scope (noted, not built):** a Contentstack site-config field setting the *default* effect
intensity per environment. Nice demo surface, but it's a schema change.

## Phase 8 — Accessibility verification

`prefers-reduced-motion` needs real work here, not just inheritance. The current global block
([globals.css:193-205](../src/app/globals.css#L193-L205)) sets `animation-duration: 0.01ms` — which
is fine for a symmetric pulse, but **freezes a glitch or sweep keyframe at an arbitrary offset**,
potentially leaving an element visibly displaced. Each new effect gets an explicit
`animation: none` plus a defined safe static state.

Also to add:
- `@media (forced-colors: active)` — Windows High Contrast strips `box-shadow` and ignores custom
  colours; notched panels and glow-only affordances must fall back to real borders.
- `@media (prefers-contrast: more)` — drop scanlines/grain to 0, borders to full strength.

**Verification we can actually run** (`npm run a11y` is documented but doesn't exist):
1. Add a real axe-core script + `reports/` output, *or* correct `accessibility.md` to describe
   manual-only verification. Recommend adding it — the doc has already drifted into asserting
   ratios that are wrong.
2. Re-run the contrast computation over the final token set (the script used for this plan's tables
   is reusable and can be committed under `scripts/`).
3. Manual sweep: keyboard-only pass on all 8 routes, VoiceOver on hero/search/browse/watch,
   200% zoom, reduced-motion on, forced-colors on, light **and** dark.
4. Update `accessibility.md` with corrected numbers and the new tokens.

---

<a id="decisions-resolved"></a>

## Decisions (resolved)

| # | Question | Decision | Consequence in this plan |
|---|---|---|---|
| **Q1** | Light mode | ✅ **Keep it**, redesigned as "daylight terminal" | Full light palette in Phase 1; `defaultTheme="dark"` with `enableSystem` retained; exposes + fixes the `resolvedTheme` toggle bug (Phase 4) |
| **Q2** | Display font | ✅ **Chakra Petch**, weights 600/700 only | Phase 2; self-hosted via `next/font/google`, two subsetted woff2 files |
| **Q3** | Effect intensity | ✅ **Restrained** — texture in chrome only | Phase 7 stands as specced; the guardrail above is binding, not aspirational |
| **Q4** | "Reduce effects" toggle | ✅ **Add it** | `.reduce-fx` token contract in Phase 1; persistence + UI in Phase 7 |
| **Q5** | Sequencing | ✅ **Foundation first**, then follow-ups | Six PRs — see below |

<a id="delivery-sequence"></a>

## Delivery sequence

All work happens on **`feat/cyber-redesign`**. Nothing is committed to `main`.

Rather than six sibling branches, each PR below targets `feat/cyber-redesign`, which merges to `main`
once the redesign is coherent end to end. That keeps `main` shippable and avoids a half-redesigned
site (new tokens, old chrome) ever being the default branch.

| PR | Phases | Contents | Reviewable because |
|---|---|---|---|
| **1** | 1–3 | Tokens, both palettes, shape/glow/texture tokens, `.reduce-fx` contract, Chakra Petch, Button/Badge/Skeleton, new CSS utilities, focus-ring fix | Self-contained: the site still renders correctly throughout, just with new primitives. The 3.30:1 AA fix ships here. |
| **2** | 4 | Header, nav, footer, site-chrome; `defaultTheme="dark"`; `resolvedTheme` toggle fix | Small, visible, includes the second a11y bug fix |
| **3** | 5 | Hero, rail, title-card, video-player chrome | The highest-visual-impact PR; worth reviewing alone |
| **4** | 6 | Eight route passes | Mostly mechanical; search + not-found are the real design work |
| **5** | 7 | Motion/texture layer + reduce-effects toggle | Additive; can be reverted independently if it doesn't land |
| **6** | 8 | Reduced-motion states, `forced-colors`, `prefers-contrast`, axe script, corrected `accessibility.md` | Verification gate before merging to `main` |

**PR 1 is the only blocking dependency** — Phases 4–7 all assume its tokens, utilities, and
focus-ring convention exist. PRs 2–5 can then proceed in parallel if useful.

### Suggested checkpoint

PR 1 is a large diff that's hard to evaluate as text. Worth running the app after it lands and
reviewing the primitives in a browser — the palette, notch geometry, and focus rings in both themes
— before PRs 2–5 build on top of them.

---

## Risks

| Risk | Mitigation |
|---|---|
| `clip-path` / `overflow:hidden` clipping focus rings and the Live Preview inspector outline | Resolved once in Phase 3 via inset `box-shadow` rings; explicit keyboard test on notched components |
| CMS-supplied artwork is arbitrary — scrims must work over anything | Scrim floor computed at 19.07:1, worst-case midpoint 13.39:1; hero copy never relies on the image being dark |
| Glow + `backdrop-filter` + many shadows across a full rail = paint cost | Glow capped to two shadow layers; card hover uses a sweep (compositor-friendly) instead of `scale`; profile a 40-card rail before merging Phase 5 |
| Two token-access spellings in the codebase (`bg-[var(--x)]` vs `bg-(--x)`) | Standardise on the v4 shorthand as each file is touched; don't do a separate churn-only pass |
| **In-flight uncommitted work** — `search/page.tsx` already has an unstaged v4-shorthand migration, carried onto `feat/cyber-redesign` | Same direction as this plan, so keep it. Commit it as its own change before PR 1 so the token diff stays readable |
| `Button`'s `asChild` uses `cloneElement` to merge classes ([button.tsx:60-67](../src/components/ui/button.tsx#L60-L67)) | Pseudo-element notches/brackets must be pure CSS on the merged class, not wrapper elements, or `asChild` breaks |
| Regressing the documented ARIA patterns in [accessibility.md](./accessibility.md) | Phases 4–6 touch `aria-*`/`role`/focus management in exactly two approved places — the `resolvedTheme` toggle fix and the new reduce-effects switch. Everywhere else is class strings only |
| The reduce-effects toggle could be mistaken for a substitute for `prefers-reduced-motion` | OS-level reduced-motion always wins independently of the toggle; both paths share one set of safe static states |
| `/setup` copy is CMS-seeded in multiple places | Style-only changes there; no string edits |

## Out of scope

Content model changes; custom video controls; new routes; the `title_grid_block` idea from
[browse-page-cms-plan.md](./browse-page-cms-plan.md); replacing `lucide-react`; anything requiring a
Contentstack schema migration; a CMS-driven default effect-intensity field (noted in Phase 7).
