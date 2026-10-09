import { notFound } from "next/navigation";
import { EmptyState, GenreBanner, PageShell, Readout, TitleGrid } from "@/design-system";
import { getAllGenres, getGenreBySlug, getTitlesByGenre, parseLivePreviewParams } from "@/lib/contentstack/queries";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenreBySlug(slug);
  if (!genre) return { title: "Genre Not Found" };
  return {
    title: `${genre.title} Titles`,
    description: genre.description,
  };
}

// See the note in src/app/watch/[slug]/page.tsx — build-time CMS reads must not
// be able to fail the build for a route that renders on demand regardless.
export async function generateStaticParams() {
  try {
    const genres = await getAllGenres();
    return genres.map((g) => ({ slug: g.slug }));
  } catch (err) {
    console.error("[contentstack] generateStaticParams failed for /genre/[slug], rendering on demand:", err);
    return [];
  }
}

export default async function GenrePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const livePreview = parseLivePreviewParams(await searchParams);
  const [genre, titles] = await Promise.all([
    getGenreBySlug(slug, livePreview),
    getTitlesByGenre(slug, livePreview),
  ]);

  if (!genre) notFound();

  return (
    <div>
      <GenreBanner genre={genre} />

      <PageShell>
        <div className="flex items-center justify-between mb-6">
          <Readout>
            {titles.length} title{titles.length !== 1 ? "s" : ""} in {genre.title}
          </Readout>
        </div>

        {titles.length > 0 ? (
          <TitleGrid titles={titles} columns="portrait-5" label={`${genre.title} titles`} />
        ) : (
          <EmptyState
            description={`No titles found in ${genre.title} yet.`}
            className="mx-auto max-w-md py-14 px-6"
          />
        )}
      </PageShell>
    </div>
  );
}
