# Flixstack — Project Overview

## Purpose
Flixstack is a small streaming front-end built with Next.js that demonstrates content-driven experiences backed by Contentstack CMS. It focuses on performant content delivery, previews, and asset handling for a streaming/catalog UI.

## Tech stack
- Next.js (app directory)
- React 19
- TypeScript
- Tailwind CSS
- Contentstack Delivery & Management SDKs
- pnpm for package management

## Quick start
Run these commands from the repo root to install and start the dev server:

```bash
pnpm install
pnpm dev
```

Useful npm scripts (from `package.json`): `dev`, `build`, `start`, `seed`, `upload-assets`.

## Key folders & files
- **App entry**: [src/app/layout.tsx](src/app/layout.tsx) — global layout and providers.
- **Pages & routes**: [src/app](src/app) — app directory pages (browse, genre, profile, search, watch, setup).
- **Components**: [src/components](src/components) — UI and CMS-related components (hero, rail, title-card, modular block renderer).
- **Lib**: [src/lib](src/lib) — utilities, mock-data, Contentstack helpers and client. Important files:
  - [src/lib/contentstack/client.ts](src/lib/contentstack/client.ts)
  - [src/lib/contentstack/normalize.ts](src/lib/contentstack/normalize.ts)
  - [src/lib/contentstack/queries.ts](src/lib/contentstack/queries.ts)
- **Scripts**: `scripts/seed.ts`, `scripts/upload-assets.ts` — helpers for seeding and uploading fixture assets.
- **Docs**: [docs/integrating-contentstack-plan.md](docs/integrating-contentstack-plan.md) and [docs/integrating-contentstack-todos.md](docs/integrating-contentstack-todos.md).

## Onboarding checklist for a new developer
1. Fork/clone the repo and run the Quick start steps.
2. Read the Integrating Contentstack plan in `docs/` to understand CMS goals.
3. Inspect `src/lib/contentstack/*` to see current client, queries, and normalize helpers.
4. Run `pnpm run seed` to populate local sample data if needed.
5. Start the app and browse `http://localhost:3000` to explore pages and components.

## Areas that need work (high level)
- Complete robust Contentstack client helpers (caching, preview resolving).
- Add Live Preview support and preview-route integration.
- Implement image delivery transforms and Next.js Image integration.
- Wire webhooks to revalidate ISR routes on content changes.
- Improve unit/integration tests around normalization and fetch helpers.

## Where to continue
Follow `docs/integrating-contentstack-todos.md` to pick up discrete tasks. The next logical implementation is scaffolding `src/lib/contentstack/client.ts` and `normalize.ts` helpers.
