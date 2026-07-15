# Flixstack — Project Overview

## Purpose

Flixstack is a Netflix-style movie & TV streaming front-end built with Next.js and
backed by Contentstack. It is a **starter template / reference app** that shows how to
build a content-driven experience on Contentstack: structured content modelling, live
CMS delivery, Live Preview / Visual Builder, ISR revalidation, and Lytics-based
personalization.

## Tech stack

- Next.js 16 (App Router, React Server Components)
- React 19
- TypeScript
- Tailwind CSS v4
- Contentstack Delivery & Management SDKs + `@contentstack/live-preview-utils` / `@contentstack/utils`
- Lytics (CDP) for audience segmentation
- pnpm for package management

## Quick start

```bash
pnpm install
pnpm dev   # → http://localhost:3000
```

Content and images are served live from Contentstack — a configured, populated stack is
required. See the root `README.md` (or the in-app `/setup` guide) for connecting a stack
and seeding content. Useful scripts (`package.json`): `dev`, `build`, `start`, `lint`,
`seed`, `upload-assets`.

## Content model

A **structured-content** model (full schema in `content-models/export.json`): 13 content
types, 6 global fields, a governed `content_tags` taxonomy, and JSON RTE for rich text.
Shared catalog fields (`title_metadata`, `artwork`) and reusable `cta` / `link` shapes are
extracted into global fields so `movie` / `tv_series` stay DRY. See the README's "Content
Models" section and `docs/refactor-content-models.md` for the rationale.

The `/setup` Developer Guide is itself content-driven, backed by the `setup_guide`
singleton (`scripts/seed-setup-guide.mjs` provisions it).

## Key folders & files

- **App entry**: `src/app/layout.tsx` — global layout, providers, and site chrome
  (header/footer/site-config fetched here on every route, with resilient fallbacks).
- **Pages & routes**: `src/app` — `browse`, `genre/[slug]`, `profile`, `search`,
  `watch/[slug]`, `setup`, plus API routes under `src/app/api` (`search`, `revalidate`,
  `site-shell`, `lytics/segment`).
- **Components**: `src/components` — `ui/`, `layout/`, `streaming/` (hero, rail,
  title-card), `cms/modular-block-renderer`, `contentstack/live-preview-init`.
- **Contentstack lib**: `src/lib/contentstack/`
  - `client.ts` — per-request Stack factory, region/preview config, feature flags.
  - `normalize.ts` — single mapping layer: raw Delivery entries → flat app types,
    RTE→HTML rendering, and `data-cslp` Visual Builder edit tags.
  - `queries.ts` — typed data fetchers (Delivery + Preview API).
- **Other lib**: `src/lib/types.ts` (types matching the model), `src/lib/lytics/`,
  `src/lib/mock-data.ts` (seed source only), `src/lib/setup-fallback.ts`.
- **Scripts**: `scripts/seed.ts`, `scripts/upload-assets.ts`, `scripts/migrate-v2.mjs`
  (structured-content migration), `scripts/seed-setup-guide.mjs`.
- **Docs**: feature deep-dives in `docs/` (`accessibility.md`, `automations.md`,
  `production-resilience.md`, `refactor-content-models.md`, and the original
  `integrating-contentstack-*.md` planning notes).

## What's implemented

- Live Contentstack delivery across all pages, with a resilient site shell (a delivery
  error in header/footer/site-config degrades to safe defaults instead of 500-ing the
  whole site — see `docs/production-resilience.md`).
- Live Preview / Visual Builder, gated behind `NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW` so
  production markup stays clean (no edit tags).
- ISR revalidation via `src/app/api/revalidate`.
- Lytics segment tracking and server-side segment resolution.
- Structured content model (global fields, taxonomy, enums, JSON RTE).

## Onboarding checklist for a new developer

1. Clone the repo, run the Quick start, and connect a stack (root `README.md`).
2. Seed the taxonomy + content (`migrate-v2.mjs terms`, `pnpm seed`,
   `pnpm upload-assets`, `seed-setup-guide.mjs`).
3. Read `src/lib/contentstack/*` — `normalize.ts` is the key mapping layer between the
   CMS shape and the app's types.
4. Browse `http://localhost:3000`, then open an entry in Contentstack and launch Visual
   Builder against the running app to see edit tags live.

## Areas that could still use work

- Automated tests (unit/integration around `normalize` and the query helpers) — none yet.
- Broader coverage of the modular-block renderer (some block types are modelled but not
  yet rendered by any page).
- Image delivery transforms / tighter `next/image` integration.
