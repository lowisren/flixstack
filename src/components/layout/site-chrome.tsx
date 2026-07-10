"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContentstackLivePreview from "@contentstack/live-preview-utils";
import { Header } from "./header";
import { Footer } from "./footer";
import type { Footer as FooterData, Header as HeaderData } from "@/lib/types";

interface SiteChromeProps {
  initialHeader?: HeaderData;
  initialFooter?: FooterData;
  siteName?: string;
  children: React.ReactNode;
}

// Root layouts can't receive `searchParams` (they don't rerender on navigation), so the
// `live_preview`/`entry_uid`/`content_type_uid` params Contentstack's preview iframe appends
// can only be read here via `useSearchParams()` in a Client Component — the pattern Next.js's
// own docs recommend for layout-scoped data that needs live query params.
function LivePreviewParamsWatcher({ onDetect }: { onDetect: (qs: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("live_preview")) onDetect(searchParams.toString());
  }, [searchParams, onDetect]);
  return null;
}

export function SiteChrome({ initialHeader, initialFooter, siteName, children }: SiteChromeProps) {
  const [header, setHeader] = useState(initialHeader);
  const [footer, setFooter] = useState(initialFooter);
  const [previewQuery, setPreviewQuery] = useState<string | null>(null);

  const refetch = useCallback(
    (qs: string) => {
      fetch(`/api/site-shell?${qs}`)
        .then((res) => res.json())
        .then((data) => {
          setHeader(data.header ?? initialHeader);
          setFooter(data.footer ?? initialFooter);
        });
    },
    [initialHeader, initialFooter]
  );

  useEffect(() => {
    if (previewQuery) refetch(previewQuery);
  }, [previewQuery, refetch]);

  // A second, independent `onEntryChange` subscriber alongside the one in `live-preview-init.tsx`
  // (which only calls `router.refresh()` — that re-runs Server Components, not this client fetch).
  useEffect(() => {
    if (!previewQuery) return;
    const callbackUid = ContentstackLivePreview.onEntryChange(() => refetch(previewQuery), {
      skipInitialRender: true,
    });
    return () => ContentstackLivePreview.unsubscribeOnEntryChange(callbackUid);
  }, [previewQuery, refetch]);

  return (
    <>
      <Suspense fallback={null}>
        <LivePreviewParamsWatcher onDetect={setPreviewQuery} />
      </Suspense>

      {/* Skip to main content — WCAG 2.1 requirement */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <Header header={header} siteName={siteName} />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>

      <Footer footer={footer} siteName={siteName} />
    </>
  );
}
