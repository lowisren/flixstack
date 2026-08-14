import { notFound } from "next/navigation";
import Image from "next/image";
import { TitleCard } from "@/components/streaming/title-card";
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
      {/* Genre hero */}
      <section
        className="hud-frame relative h-48 sm:h-64 overflow-hidden bg-[#05070A]"
        aria-label={`${genre.title} genre`}
        data-cs-entry={genre.uid}
        data-cs-content-type="genre"
      >
        {genre.hero_image && (
          <Image
            src={genre.hero_image.url}
            alt=""
            fill
            className="object-cover opacity-40"
            aria-hidden="true"
          />
        )}
        {/* Genre identity tint, then the same fixed-dark scrim as the other
            heroes. The copy below is white, so its contrast must not depend on
            color_accent — that field is editor-chosen in Contentstack, and a
            light accent (e.g. a yellow "Comedy") took the heading to 3.40:1 in
            dark mode when the text sat directly on the tint. */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${genre.color_accent}80, transparent)`,
          }}
          aria-hidden="true"
        />
        <div className="hero-scrim scanlines absolute inset-0" aria-hidden="true" />
        <div className="relative h-full flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-1 w-8"
              style={{ backgroundColor: genre.color_accent }}
              aria-hidden="true"
            />
            <span className="font-mono text-xs uppercase tracking-widest text-white/70">Genre</span>
          </div>
          <h1 className="font-display chromatic text-4xl uppercase text-white" {...genre.$?.title}>
            {genre.title}
          </h1>
          <p className="text-white/85 mt-1 max-w-xl" {...genre.$?.description}>
            {genre.description}
          </p>
        </div>
      </section>

      {/* Titles grid */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent tabular-nums">
            [ {titles.length} title{titles.length !== 1 ? "s" : ""} in {genre.title} ]
          </p>
        </div>

        {titles.length > 0 ? (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            role="list"
            aria-label={`${genre.title} titles`}
          >
            {titles.map((title) => (
              <div key={title.uid} role="listitem">
                <TitleCard
                  title={title}
                  layout="portrait"
                  data-cs-entry={title.uid}
                  data-cs-content-type={title.content_type}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="notch scanlines relative mx-auto max-w-md border border-border-control bg-surface py-14 px-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-signal mb-2">
              No signal
            </p>
            <p className="text-text-secondary">
              No titles found in {genre.title} yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
