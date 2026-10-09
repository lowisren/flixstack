import { notFound } from "next/navigation";
import { ModularBlockRenderer } from "@/components/cms/modular-block-renderer";
import { ModularPageTemplate } from "@/design-system";
import { getPageBySlug, parseLivePreviewParams } from "@/lib/contentstack/queries";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("tv-show");
  return { title: page?.title ?? "TV Shows" };
}

export default async function TvShowsLandingPage({ searchParams }: PageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);
  const page = await getPageBySlug("tv-show", livePreview);
  if (!page) notFound();

  return (
    <ModularPageTemplate title={page.title} editable={page.$?.title}>
      <ModularBlockRenderer blocks={page.sections} />
    </ModularPageTemplate>
  );
}
