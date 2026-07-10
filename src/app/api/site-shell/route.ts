import { NextResponse, type NextRequest } from "next/server";
import { getFooter, getHeader, parseLivePreviewParams } from "@/lib/contentstack/queries";

// Serves live-preview-aware header/footer data to the client `SiteChrome` component.
// A Route Handler is required (rather than fetching Contentstack directly from the
// client) because `CONTENTSTACK_PREVIEW_TOKEN` is server-only.
export async function GET(request: NextRequest) {
  const livePreview = parseLivePreviewParams(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const [header, footer] = await Promise.all([getHeader(livePreview), getFooter(livePreview)]);
  return NextResponse.json({ header, footer });
}
