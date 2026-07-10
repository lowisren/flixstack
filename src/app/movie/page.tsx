import { notFound } from "next/navigation";
import { ModularBlockRenderer } from "@/components/cms/modular-block-renderer";
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
    <div className="py-8">
      <div className="px-4 sm:px-6 lg:px-8 mb-2">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]" {...page.$?.title}>
          {page.title}
        </h1>
      </div>
      <ModularBlockRenderer blocks={page.sections} />
    </div>
  );
}
