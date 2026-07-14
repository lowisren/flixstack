"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import contentstack from "@contentstack/delivery-sdk";
import ContentstackLivePreview, { type IStackSdk } from "@contentstack/live-preview-utils";
import { REGION_MAP, PREVIEW_HOST_MAP } from "@/lib/contentstack/regions";

// Mounted once in the root layout. Establishes the postMessage bridge between this
// app and the Contentstack dashboard/Visual Builder iframe. Does not fetch content
// itself (deliveryToken is a stub) — actual preview data comes from the per-request
// server-side `stack.livePreviewQuery()` wiring in queries.ts; this component just
// tells the editor "the page is ready" and refreshes the router on entry changes.
export function LivePreviewInit() {
  const router = useRouter();

  useEffect(() => {
    // Disabled on production/live environments — no Visual Builder bridge or edit buttons.
    if (process.env.NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW !== "true") return;

    const apiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
    const environment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT;
    const region = process.env.NEXT_PUBLIC_CONTENTSTACK_REGION ?? "US";
    if (!apiKey || !environment) return;

    const stack = contentstack.stack({
      apiKey,
      deliveryToken: "unused-on-client",
      environment,
      region: REGION_MAP[region] ?? REGION_MAP.US,
      live_preview: {
        enable: true,
        host: PREVIEW_HOST_MAP[region] ?? PREVIEW_HOST_MAP.US,
      },
    });

    ContentstackLivePreview.init({
      ssr: true,
      enable: true,
      mode: "builder",
      stackSdk: stack.config as unknown as IStackSdk,
      stackDetails: { apiKey, environment },
      editButton: { enable: true },
      editInVisualBuilderButton: { enable: true, position: "bottom-right" },
    });

    const callbackUid = ContentstackLivePreview.onEntryChange(() => {
      router.refresh();
    });

    return () => {
      ContentstackLivePreview.unsubscribeOnEntryChange(callbackUid);
    };
  }, [router]);

  return null;
}
