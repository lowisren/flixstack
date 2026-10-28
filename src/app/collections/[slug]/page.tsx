import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCompositionMetadata,
  getSSRStyles,
  isCompositionNotFound,
  isStudioEditorMode,
} from "@contentstack/studio-react";
import { sdk } from "@/lib/studio/sdk";
import { StudioPage, StudioPageClient } from "@/studio/studio-page";

// Pages built in Contentstack Studio from the "Collection page" template
// (connected to `landing_page`, URL `/collections/{{entry.slug}}`).
// A dedicated route rather than a site-wide catch-all, so every existing route keeps
// its URL; a template with a new URL prefix needs its own route like this one.

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSearchQuery(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  return query;
}

/**
 * Studio's editor iframe and Live Preview requests render in the browser instead:
 * the server-side Studio instance is a published-only singleton (lib/studio/sdk.ts).
 */
function isPreviewRequest(query: URLSearchParams) {
  return isStudioEditorMode(query) || query.has("live_preview");
}

/**
 * Fetches the published composition for a URL, or null when no template or entry
 * matches. Anything else (token, network, CDA failure) rethrows and answers 500, so
 * an outage never masquerades as a missing page.
 */
const resolveComposition = cache(async (url: string) => {
  try {
    return await sdk.fetchCompositionData({ url, searchQuery: "" });
  } catch (error) {
    if (isCompositionNotFound(error)) return null;
    throw error;
  }
});

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isPreviewRequest(toSearchQuery(await searchParams))) return {};

  const specOptions = await resolveComposition(`/collections/${slug}`);
  if (!specOptions) return { title: "Not Found" };

  const { title, description, ogImage } = getCompositionMetadata(specOptions);
  return {
    title,
    description,
    openGraph: { title, description, images: ogImage ? [ogImage] : [] },
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (isPreviewRequest(toSearchQuery(await searchParams))) return <StudioPageClient />;

  const specOptions = await resolveComposition(`/collections/${slug}`);
  if (!specOptions) notFound();

  return (
    <>
      {/* Emitted from the server page, not the client wrapper, to avoid a hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: getSSRStyles(specOptions.spec) }} />
      <StudioPage specOptions={specOptions} />
    </>
  );
}
