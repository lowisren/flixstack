import { notFound } from "next/navigation";
import { ModularBlockRenderer } from "@/components/cms/modular-block-renderer";
import { ModularPageTemplate } from "@/design-system";
import { getPageBySlug, parseLivePreviewParams } from "@/lib/contentstack/queries";
import type { Metadata } from "next";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("movie");
  return { title: page?.title ?? "Movies" };
}

export default async function MoviesLandingPage({ searchParams }: PageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);
  const page = await getPageBySlug("movie", livePreview);
  if (!page) notFound();

  return (
    <ModularPageTemplate title={page.title} editable={page.$?.title}>
      <ModularBlockRenderer blocks={page.sections} />
    </ModularPageTemplate>
  );
}
