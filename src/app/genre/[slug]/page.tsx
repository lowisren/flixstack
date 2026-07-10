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

export async function generateStaticParams() {
  const genres = await getAllGenres();
  return genres.map((g) => ({ slug: g.slug }));
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
        className="relative h-48 sm:h-64 overflow-hidden"
        aria-label={`${genre.title} genre`}
        data-cs-entry={genre.uid}
        data-cs-content-type="genre"
        style={{ backgroundColor: genre.color_accent + "20" }}
      >
        {genre.hero_image && (
          <Image
            src={genre.hero_image.url}
            alt=""
            fill
            className="object-cover opacity-30"
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${genre.color_accent}80, transparent)`,
          }}
          aria-hidden="true"
        />
        <div className="relative h-full flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="h-1 w-8 rounded-full"
              style={{ backgroundColor: genre.color_accent }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Genre</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]" {...genre.$?.title}>
            {genre.title}
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1 max-w-xl" {...genre.$?.description}>
            {genre.description}
          </p>
        </div>
      </section>

      {/* Titles grid */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[var(--color-text-secondary)] text-sm">
            {titles.length} title{titles.length !== 1 ? "s" : ""} in {genre.title}
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
          <div className="py-20 text-center">
            <p className="text-[var(--color-text-secondary)]">
              No titles found in {genre.title} yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
