# Integrating Contentstack with Next.js — Actionable TODOs

This file contains the step-by-step tasks you can pick up when your session resumes.

## Quick checklist

1. [ ] Inventory: confirm Contentstack stack, Delivery API token, Management token, and stack details.
2. [ ] Install SDK: add `contentstack` or appropriate SDK to `package.json`.
3. [ ] Create client & config: add `src/lib/contentstack/client.ts` to initialize SDK using env vars.
4. [ ] Add types and normalizers: create `src/lib/contentstack/types.ts` and `src/lib/contentstack/normalize.ts`.
5. [ ] Implement data fetching examples:
   - [ ] a) SSG page example with `fetch` and revalidate
   - [ ] b) SSR page example
   - [ ] c) API route example for content queries
6. [ ] Image helper: implement asset URL builder and integrate with Next.js Image component.
7. [ ] Preview support: add preview route and instructions to enable preview in Contentstack.
8. [ ] Webhook endpoint: implement `/api/revalidate` to receive Contentstack webhooks and call revalidate.
9. [ ] Locales: map Contentstack locales to Next.js locales and add example pages.
10. [ ] Tests: add unit tests for normalization and fetch helpers.
11. [ ] Documentation: update this repo's README with setup steps and env var requirements.
12. [ ] Security review: ensure no sensitive tokens are exposed to the client.

## Estimated order of work
- Phase A (days 1–2): steps 1–4, SDK install, client, types, and normalize.
- Phase B (days 2–4): steps 5–7, data fetching, images, and preview.
- Phase C (days 4–6): steps 8–11, webhooks, locales, tests, and docs.

## Environment variables (suggested)
- `CONTENTSTACK_API_KEY` — Delivery API key (server-safe)
- `CONTENTSTACK_ENV` — Contentstack environment name
- `CONTENTSTACK_MANAGEMENT_TOKEN` — Management token (server-only)
- `CONTENTSTACK_DELIVERY_TOKEN` — Delivery token for public client (if needed)

## How to pick up where you left off
- Start at item 1 in the Quick checklist and complete items in order.
- For Live Preview diagnostics, reproduce steps using a local Vercel-like environment or `vercel dev`.
