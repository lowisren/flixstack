// ============================================================
// ContentStack Delivery SDK Client
// Set these environment variables in .env.local to enable live CMS data:
//   NEXT_PUBLIC_CONTENTSTACK_API_KEY         — Stack API key
//   NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN  — Delivery token for the environment
//   NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT     — Environment name (e.g., "development")
//   NEXT_PUBLIC_CONTENTSTACK_REGION          — Optional: "US" (default), "EU", "AZURE_NA", "AZURE_EU", "GCP_NA", "GCP_EU"
//   NEXT_PUBLIC_CONTENTSTACK_BRANCH          — Optional: content branch to read from (default "main")
//   CONTENTSTACK_PREVIEW_TOKEN               — Server-only. Required for Live Preview / Visual Builder.
// ============================================================

import contentstack, { Region, type Stack } from "@contentstack/delivery-sdk";
import { REGION_MAP, PREVIEW_HOST_MAP } from "./regions";

export const CS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY ?? "",
  deliveryToken: process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN ?? "",
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT ?? "",
  region: process.env.NEXT_PUBLIC_CONTENTSTACK_REGION ?? "US",
  branch: process.env.NEXT_PUBLIC_CONTENTSTACK_BRANCH ?? "main",
  // Server-only — never exposed to the client bundle.
  previewToken: process.env.CONTENTSTACK_PREVIEW_TOKEN ?? "",
};

export const isCSConfigured =
  Boolean(CS_CONFIG.apiKey) && Boolean(CS_CONFIG.deliveryToken) && Boolean(CS_CONFIG.environment);

export const isLivePreviewConfigured = isCSConfigured && Boolean(CS_CONFIG.previewToken);

/**
 * Creates a fresh Stack instance. Per Contentstack's SSR guidance, a stack must be created
 * inside each request/server call (never module-scoped) so a live-preview hash from one
 * request can never leak into another request's render.
 */
export function createStack(): Stack {
  return contentstack.stack({
    apiKey: CS_CONFIG.apiKey,
    deliveryToken: CS_CONFIG.deliveryToken,
    environment: CS_CONFIG.environment,
    region: REGION_MAP[CS_CONFIG.region] ?? Region.US,
    branch: CS_CONFIG.branch,
    live_preview: isLivePreviewConfigured
      ? {
          enable: true,
          preview_token: CS_CONFIG.previewToken,
          host: PREVIEW_HOST_MAP[CS_CONFIG.region] ?? PREVIEW_HOST_MAP.US,
        }
      : undefined,
  });
}
