"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ContentstackLivePreview from "@contentstack/live-preview-utils";
import {
  StudioComponent,
  isCompositionNotFound,
  useCompositionData,
  type StudioComponentSpecOptions,
} from "@contentstack/studio-react";
import { EmptyState, Spinner } from "@/design-system";
import "@/studio/register";

/** Visitor render: the server already fetched the published composition. */
export function StudioPage({ specOptions }: { specOptions: StudioComponentSpecOptions }) {
  return <StudioComponent specOptions={specOptions} />;
}

/**
 * Editor and preview render, fetched in the browser. Used inside Studio's iframe
 * (including unsaved templates, which have nothing published to fetch on the server)
 * and for Live Preview requests, so a draft hash never touches the server singleton
 * (see lib/studio/sdk.ts).
 */
export function StudioPageClient() {
  const pathname = usePathname();
  const composition = useCompositionData({ url: pathname });
  const { refetchData } = composition;

  // The SDK doesn't subscribe to Live Preview itself.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CONTENTSTACK_LIVE_PREVIEW !== "true") return;
    const callbackUid = ContentstackLivePreview.onEntryChange(refetchData, { skipInitialRender: true });
    return () => ContentstackLivePreview.unsubscribeOnEntryChange(callbackUid);
  }, [refetchData]);

  if (composition.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (composition.error) {
    const { error } = composition;
    return (
      <EmptyState
        signal={isCompositionNotFound(error) ? "404" : "Error"}
        title={isCompositionNotFound(error) ? "No template for this page yet" : "This page failed to load"}
        description={error instanceof Error ? error.message : "Something went wrong."}
      />
    );
  }
  // The hook's result type doesn't narrow on `error`; a loaded state always has options.
  if (!composition.specOptions) return null;
  return <StudioComponent specOptions={composition.specOptions} />;
}
