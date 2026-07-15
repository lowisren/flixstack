# Production Resilience — How Flixstack Survives a Bad CMS Read

## Purpose
This doc explains a hardening change made after Flixstack's Launch **production** deployment
showed *"This page couldn't load"* on **every** page. It's here so the next developer understands
why the CMS-fetching code is defensive, and what to check first if the site goes dark again.

## TL;DR
The root layout reads a few Contentstack entries (header, footer, site config) on **every route**.
If that read *throws*, the layout crashes and **the entire site 500s** — not just one page. We made
those layout-level reads fail *soft* (log + fall back) instead of *hard* (throw), and guarded the
hero against empty content. A bad or misconfigured environment now degrades gracefully instead of
taking the whole site down.

## The incident

Symptom: Launch production returned a generic *"This page couldn't load"* error on every route.

Root cause, confirmed via the Management API:
1. The **`production` Contentstack environment had zero published content.** Every entry and all 85
   assets had only ever been published to `development`. (Contentstack publishes are
   *per-environment* — publishing to `development` does nothing for `production`.)
2. The **delivery token in use was scoped to `development`**, so querying `production` returned
   `APIError 141: "Environment was not found"` — a hard error, not an empty result.

Why one bad read killed the whole site: [src/app/layout.tsx](src/app/layout.tsx) does

```ts
const [header, footer, siteConfig] = await Promise.all([getHeader(), getFooter(), getSiteConfig()]);
```

This runs for **every** page (it's the root layout). When `getHeader()` threw the `141` error, the
`await` rejected, the layout render failed, and Next.js returned a 500 for whatever route was
requested. Every route hits the layout, so every route broke.

## What we changed

### 1. Layout-critical queries fail soft — [src/lib/contentstack/queries.ts](src/lib/contentstack/queries.ts)
`getHeader`, `getFooter`, and `getSiteConfig` now wrap their delivery call in `try/catch`. On error
they log and return a safe fallback (`undefined` for header/footer, `DEFAULT_SITE_CONFIG` for site
config) instead of throwing:

```ts
export async function getHeader(livePreview?: LivePreviewQuery): Promise<Header | undefined> {
  try {
    // ...delivery query...
    return raw ? normalizeHeader(raw) : undefined;
  } catch (err) {
    console.error("[contentstack] getHeader failed:", err);
    return undefined;
  }
}
```

The layout already tolerates a missing header/footer (the `Header`/`Footer` components accept
`undefined`), so the page renders without chrome instead of 500-ing.

**Design note — why only these three?** They run in the root layout, so their failure is
catastrophic (whole-site). **Page-level queries were left to throw on purpose** — e.g. a broken
movie query should fail *that one route* (and surface the error), not be silently swallowed
everywhere. Fail soft where a failure is global; fail loud where a failure is local.

### 2. Hero guards against empty content — [src/components/streaming/hero.tsx](src/components/streaming/hero.tsx)
The hero read `banners[current]` and then accessed `banner.background_image`, `banner.title`, etc.
With no banners published, `banner` is `undefined` and the component crashed. Added, after all hooks
(so hook order stays stable):

```ts
const banner = banners[current];
if (!banner) return null; // no hero content — render nothing instead of crashing
```

### 3. Publish content to `production` — [scripts/migrate-v2.mjs](scripts/migrate-v2.mjs)
Hardening keeps the site *up*, but production still needs *content*. The migration script gained a
`publishprod` phase that publishes all entries **and assets** on `main` to the `production`
environment:

```bash
node scripts/migrate-v2.mjs publishprod   # publishes entries + 85 assets to `production`
```

Assets are published separately from entries — image `<Image>` tags 404 unless the asset itself is
published to the environment being read.

## Verification
- `tsc` clean; `development` env renders home / setup / browse with no regression.
- Forced-failure simulation (point the app at `production` with a token that can't read it):
  `/setup` went **500 → 200**, the whole-site crash was gone, and the caught errors appeared in the
  server log instead of taking the site down.

## Runbook — if the production site goes dark again
Work top-down; the first two cover the incident above.

1. **Is content published to the reading environment?** Check the environment named by
   `NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT` on the deployment. Publishing to `development` does **not**
   publish to `production`. Re-run `node scripts/migrate-v2.mjs publishprod` (or publish from the
   Contentstack UI). Remember assets are per-environment too.
2. **Can the delivery token reach the environment *and* branch?** A `141 "Environment was not found"`
   means the token isn't scoped to that environment; a `901` access error usually means the branch
   isn't in scope. Delivery tokens are scoped per-environment and per-branch in the Contentstack
   token settings. (The Management API token cannot edit delivery tokens — do this in the UI.)
3. **Do the deployment's env vars match?** `NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT`,
   `NEXT_PUBLIC_CONTENTSTACK_BRANCH` (defaults to `main`), `NEXT_PUBLIC_CONTENTSTACK_API_KEY`,
   `NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN`. See [.env.local.example](.env.local.example).
4. **Check the server logs.** Thanks to the fail-soft change, layout read failures now log
   `[contentstack] getHeader/getFooter/getSiteConfig failed: …` rather than only showing a 500 —
   the message usually names the exact cause (environment, branch, or token).

## Related
- [docs/project-overview.md](docs/project-overview.md) — architecture and folder map.
- [content-models/MIGRATION_STATUS.md](content-models/MIGRATION_STATUS.md) — the structured-content
  (v2) model this resilience work shipped alongside.
