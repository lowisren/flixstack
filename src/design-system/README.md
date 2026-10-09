# Flixstack design system

Every token and UI component in Flixstack lives here. Pages in `src/app` fetch data, choose a
template, and assemble sections; they don't define their own UI.

Browse it live at **`/design-system`** (`npm run dev`). In a production build the page returns
404 unless `NEXT_PUBLIC_DESIGN_SYSTEM=true` is set at build time.

```ts
import { Button, Rail, PageShell } from "@/design-system";
```

## Structure

| Folder | What goes in it | Atomic-design name |
|---|---|---|
| `tokens/` | CSS custom properties (`tokens.css`), base styles and effect utilities (`effects.css`), accessibility media queries (`a11y.css`), the Live Preview inspector (`preview.css`), and layout class tokens (`layout.ts`) | tokens |
| `primitives/` | The smallest pieces: Button, Heading, Panel, Switch… Plain props only, no app data | atoms |
| `patterns/` | Small combinations of primitives: SectionHeader, SearchField, EmptyState… Still no app data | molecules |
| `sections/` | Page sections: TitleCard, Hero, EpisodeList… May take Contentstack types from `src/lib/types.ts` | organisms |
| `templates/` | Page layouts: PageShell, DetailTemplate, ModularPageTemplate. No data fetching | templates |

`src/app/globals.css` imports the four token files **in order**. Each file overrides the one
before it, so don't reorder them.

Modular blocks map to sections: `hero_block` → `Hero`, `rail_block` → `Rail`, `promo_block` →
`PromoBlock`, `genre_spotlight_block` → `GenreSpotlight`. The mapping lives in
`src/components/cms/modular-block-renderer.tsx`.

## Rules

1. **Only sections know about Contentstack.** Primitives and patterns take strings, numbers,
   links and children.
2. **Pass Live Preview edit tags through.** A component that shows a CMS field takes an
   `editable` prop (a `CslpTag`), or spreads the entry's `$` tag, onto the element that holds
   the text. A dropped tag silently breaks click-to-edit.
3. **Server components by default.** Put `"use client"` only on the smallest piece that needs
   state or browser APIs (`FallbackImage`, not `TitleCard`).
4. **React 19.** Use `ref` as a normal prop; no `forwardRef`. Variants are typed lookup maps
   combined with `cn()`.
5. **Colours come from tokens.** No `white`/`black`, raw palette classes (`red-600`), hex
   literals or `bg-[var(--x)]`; ESLint blocks all four. Artwork chrome uses the on-media tokens
   (`text-on-media/70`, `border-on-media/25`, `bg-media-shade/70`, `bg-media-ground`) and always
   sits on the fixed dark scrim.
6. **Never hardcode an opacity, glow or shadow** that bypasses the effect tokens. `.reduce-fx`,
   `prefers-reduced-motion`, `prefers-contrast` and forced colours all switch effects off at the
   token level.
7. **Notched shapes get an inset focus ring.** `clip-path` clips outlines, so `.notch` and
   `.notch-sm` draw focus as an inset `box-shadow`. A focusable element *inside* a notched
   container takes `.focus-inset`. Never put a glow on anything focusable, because glow and the
   focus ring both use `box-shadow`.
8. **Global utilities never set `position`.** Classes in `effects.css` are unlayered, so they
   beat Tailwind's utilities whatever the specificity. A `position` there overrides `sticky` or
   `absolute` on the same element; it has broken the sticky header and the hero scrim before.
   The component supplies `relative`/`absolute`.
9. **State is never shown by colour alone.** Pair colour with shape, position, text or an ARIA
   state (`aria-current`, `aria-pressed`, `aria-checked`).

## Adding or changing a component

1. Put it in the lowest level that fits, and export it from `index.ts`.
2. Add a `<Specimen>` to `src/app/design-system/page.tsx` showing its variants and states. Set
   `cms` if it renders CMS fields, so the edit-tag check covers it.
3. Run the checks below.

## Checks

| Command | What it checks |
|---|---|
| `npm run lint` | Includes the token guardrail (rule 5) |
| `npm run check-contrast` | Every token pair against WCAG thresholds, including on-media text |
| `npm run a11y` | axe on every route and `/design-system`, both themes, plus the Live Preview edit-tag check. Needs a running server |
| `npm run snapshot -- --compare` | Pixel diff of every route (both themes, effects on/off, 1440px and 390px) against `--baseline`. Use it for refactors that should not change how anything looks |
