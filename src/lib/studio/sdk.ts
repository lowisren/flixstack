// ============================================================
// Contentstack Studio SDK
//
// `studioSdk.init` is a per-process singleton (a second call warns and returns the
// first instance), so it can't be created per request the way `createStack()` is.
// That rules out sharing the app's stack and shapes this file:
//
//   - Studio gets its OWN Delivery stack. queries.ts calls `livePreviewQuery` on its
//     stacks, and Studio does the same on whatever stack it is given.
//   - The server-side instance has NO live preview. Studio only ever *sets* a preview
//     hash (it never clears one), so a preview-enabled singleton would carry one
//     editor's draft hash into later visitors' requests. Draft/editor renders go
//     through the client instead (see app/collections/[slug]/page.tsx).
//   - The browser instance previews drafts when Live Preview is on (development
//     only), using NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN. That is the one preview
//     token the browser ever sees; the app's own previews stay server-side with
//     CONTENTSTACK_PREVIEW_TOKEN. Each tab holds its own hash, so nothing leaks.
//
// Imported for its side effect by app/studio-init.tsx (client) and directly by the
// /collections server route; both evaluate it once per runtime.
// ============================================================

import contentstack from "@contentstack/delivery-sdk";
import { studioSdk } from "@contentstack/studio-react";
import { CS_CONFIG, LIVE_PREVIEW_ENABLED, isCSConfigured } from "@/lib/contentstack/client";
import { PREVIEW_HOST_MAP, REGION_MAP } from "@/lib/contentstack/regions";

/** UID of the content type Studio stores templates and sections in. Set when the project was created. */
export const STUDIO_CONTENT_TYPE =
  process.env.NEXT_PUBLIC_CONTENTSTACK_STUDIO_CONTENT_TYPE || "compositions";

const browserPreviewToken =
  typeof window !== "undefined" && LIVE_PREVIEW_ENABLED
    ? (process.env.NEXT_PUBLIC_CONTENTSTACK_PREVIEW_TOKEN ?? "")
    : "";

const stack = contentstack.stack({
  apiKey: CS_CONFIG.apiKey,
  deliveryToken: CS_CONFIG.deliveryToken,
  environment: CS_CONFIG.environment,
  region: REGION_MAP[CS_CONFIG.region] ?? REGION_MAP.US,
  branch: CS_CONFIG.branch,
  live_preview: browserPreviewToken
    ? {
        enable: true,
        preview_token: browserPreviewToken,
        host: PREVIEW_HOST_MAP[CS_CONFIG.region] ?? PREVIEW_HOST_MAP.US,
      }
    : undefined,
});

export const sdk = studioSdk.init({
  stackSdk: stack,
  contentTypeUid: STUDIO_CONTENT_TYPE,
  // Registered components receive `$<prop>` edit tags to spread, so bound values are
  // clickable in Visual Editor. Without this, no component gets tags at all.
  cslp: { appendTags: true },
});

export const isStudioConfigured = isCSConfigured;
