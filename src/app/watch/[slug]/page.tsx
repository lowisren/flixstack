import { notFound } from "next/navigation";
import { getTitleBySlug, getAllTitles, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { stripHtml } from "@/lib/utils";
import { WatchContent } from "./watch-content";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) return { title: "Not Found" };
  const description = stripHtml(title.synopsis).slice(0, 160);
  return {
    title: title.title,
    description,
    openGraph: {
      title: title.title,
      description,
      images: title.hero_image ? [title.hero_image.url] : [],
    },
  };
}

// Prerendering is an optimisation, not a correctness requirement. This runs at
// build time, so an unconfigured or unreachable Contentstack — env vars not yet
// set on a deploy target, say — would otherwise fail the entire build rather
// than degrade one route. Fall back to rendering on demand, which is what this
// route does anyway: awaiting searchParams for live preview marks it dynamic.
export async function generateStaticParams() {
  try {
    const titles = await getAllTitles();
    return titles.map((t) => ({ slug: t.slug }));
  } catch (err) {
    console.error("[contentstack] generateStaticParams failed for /watch/[slug], rendering on demand:", err);
    return [];
  }
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const livePreview = parseLivePreviewParams(await searchParams);
  const title = await getTitleBySlug(slug, livePreview);

  if (!title) notFound();

  // Related titles — same genre, excluding current
  const allTitles = await getAllTitles(livePreview);
  const related = allTitles
    .filter(
      (t) =>
        t.uid !== title.uid &&
        t.genres.some((g) => title.genres.some((tg) => tg.uid === g.uid))
    )
    .slice(0, 8);

  return <WatchContent title={title} related={related} />;
}
