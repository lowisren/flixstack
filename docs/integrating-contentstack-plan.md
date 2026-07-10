# Integrating Contentstack with Next.js — Project Plan

## Overview
Goal: Integrate Contentstack as the CMS for the Next.js app, enabling content delivery, Live Preview, assets handling, localization, and production-ready revalidation.

## Objectives
- Provide a Contentstack client and helpers in `src/lib/contentstack/`
- Implement data normalization and type mapping
- Support SSR, SSG, and ISR use-cases with revalidation
- Enable Live Preview / Visual Builder compatibility
- Securely manage environment variables and tokens

## Assumptions
- You have a Contentstack stack and Delivery API token(s).
- The app uses Next.js 14+ app directory (repo already contains `src/app`).

## High-level Plan
1. Prepare Contentstack: create stack, API keys, and roles. Document tokens and environments.
2. SDK & client: install `contentstack` or `@contentstack/next` (if using official SDK), add `src/lib/contentstack/client.ts` and exports.
3. Model mapping: map Content Types to local TypeScript types in `src/lib/contentstack/types.ts` and create `normalize.ts` helpers.
4. Data fetching patterns: decide per-page strategy (SSG with `fetch` + `cache: 'force-cache'`, ISR via `revalidate`, or SSR). Document examples for page, route handlers, and `getStaticProps` equivalents.
5. Assets & Image Delivery: use Contentstack Image Delivery API; create `imageHelper` for transforms and integrate with Next.js Image component.
6. Live Preview & Visual Builder: implement preview route/handler that resolves preview tokens and redirects to the page with preview context; wire preview headers and draft content fetching.
7. Localization: detect and map locales; implement fallback strategy and locale-aware queries.
8. Webhooks & Incremental Revalidation: create webhook endpoint to receive publish/unpublish events and call Next.js revalidation API for affected routes.
9. Security & env: store tokens in environment variables; use least-privilege tokens for client vs server usage.
10. Testing & QA: add unit tests for `normalize.ts`, integration test for fetch helpers, and manual checks for Live Preview behavior.
11. Deployment: document necessary environment variables for Vercel (or target host) and CI steps.

## Deliverables
- `/docs/integrating-contentstack-plan.md` (this file)
- `/docs/integrating-contentstack-todos.md` (actionable steps)
- Client and helper files under `src/lib/contentstack/`
- Webhook route under `src/app/api/revalidate/route.ts` (or existing webhooks file)

## Acceptance Criteria
- Pages render published content with correct assets and locales.
- Live Preview shows unpublished drafts when preview mode is active.
- Webhook-triggered revalidation updates affected routes within seconds.

## References & Next Steps
- Review Contentstack docs: Live Preview, Image Delivery API, and Webhooks.
- Create the actionable TODOs document next.
