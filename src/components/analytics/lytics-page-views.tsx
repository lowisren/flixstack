"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// window.jstag is typed in @/lib/lytics/client.

// Fires a Lytics page view on first paint and on every client-side route change.
// The tag's own jstag.pageView() only runs once per full document load, so without
// this every in-app navigation would go unrecorded. Calls made before the async
// Lytics library finishes loading are queued by the tag stub, so this is safe to
// call immediately after hydration.
export function LyticsPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  useEffect(() => {
    window.jstag?.pageView();
  }, [pathname, queryString]);

  return null;
}
