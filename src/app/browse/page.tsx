import type { Metadata } from "next";
import { ModularBlockRenderer } from "@/components/cms/modular-block-renderer";
import { getAllTitles, getAllGenres, getPageBySlug, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { BrowseClient } from "./browse-client";

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("browse");
  return {
    title: page?.seo?.meta_title ?? page?.title ?? "Browse All Titles",
    description: page?.seo?.meta_description,
  };
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);
  const [titles, genres, page] = await Promise.all([
    getAllTitles(livePreview),
    getAllGenres(livePreview),
    getPageBySlug("browse", livePreview),
  ]);

  return (
    <>
      {/* Editor-composed sections (hero, promo/CTA, …) render above the catalog.
          Absent when no `browse` page entry is published — the grid still renders. */}
      {page && page.sections.length > 0 && (
        <div className="py-8">
          <ModularBlockRenderer blocks={page.sections} />
        </div>
      )}
      <BrowseClient titles={titles} genres={genres} heading={page?.title} />
    </>
  );
}
