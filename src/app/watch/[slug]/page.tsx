import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Star, Clock, Calendar, ChevronDown, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rail } from "@/components/streaming/rail";
import { getTitleBySlug, getAllTitles, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { formatRuntime, getRatingColor, cn, stripHtml } from "@/lib/utils";
import type { Movie, TvSeries } from "@/lib/types";
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

export async function generateStaticParams() {
  const titles = await getAllTitles();
  return titles.map((t) => ({ slug: t.slug }));
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const livePreview = parseLivePreviewParams(await searchParams);
  const title = await getTitleBySlug(slug, livePreview);

  if (!title) notFound();

  const isMovie = title.content_type === "movie";
  const movie = isMovie ? (title as Movie) : null;
  const series = !isMovie ? (title as TvSeries) : null;

  // Related titles — same genre, excluding current
  const allTitles = await getAllTitles(livePreview);
  const related = allTitles
    .filter(
      (t) =>
        t.uid !== title.uid &&
        t.genres.some((g) => title.genres.some((tg) => tg.uid === g.uid))
    )
    .slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section
        className="relative w-full h-[55vh] min-h-[380px] overflow-hidden bg-[var(--color-bg-elevated)]"
        aria-label={`${title.title} hero image`}
        data-cs-entry={title.uid}
        data-cs-content-type={title.content_type}
      >
        {title.hero_image && (
          <Image
            src={title.hero_image.url}
            alt={`${title.title} hero image`}
            fill
            className="object-cover"
            priority
            {...title.$?.hero_image}
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)] via-transparent to-transparent"
          aria-hidden="true"
        />

        {/* Content overlay */}
        <div className="relative h-full flex items-end pb-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-end gap-6">
            {/* Thumbnail */}
            <div className="hidden sm:block w-32 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 border border-white/10">
              {title.thumbnail && (
                <Image
                  src={title.thumbnail.url}
                  alt={title.title}
                  width={128}
                  height={192}
                  className="object-cover"
                  {...title.$?.thumbnail}
                />
              )}
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {title.content_tier === "premium" && (
                  <Badge variant="premium">Premium</Badge>
                )}
                <Badge variant="rating" className={getRatingColor(title.rating)}>
                  {title.rating}
                </Badge>
                <span className="text-white/60 text-sm">
                  {new Date(title.release_date).getFullYear()}
                </span>
                {movie && (
                  <span className="text-white/60 text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {formatRuntime(movie.runtime)}
                  </span>
                )}
                {series && (
                  <span className="text-white/60 text-sm flex items-center gap-1">
                    <Tv className="h-3 w-3" aria-hidden="true" />
                    {series.seasons.length} Season{series.seasons.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight" {...title.$?.title}>
                {title.title}
              </h1>

              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1 text-[var(--color-accent)] font-semibold">
                  <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span aria-label={`Score: ${title.score} out of 100`}>{title.score}</span>
                  <span className="text-white/40 text-sm font-normal">/100</span>
                </span>
                {title.genres.map((g) => (
                  <Link
                    key={g.uid}
                    href={`/genre/${g.slug}`}
                    className="text-sm text-white/60 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
                  >
                    {g.title}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Button size="lg" className="gap-2">
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  {isMovie ? "Play Movie" : "Play Episode 1"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  Watchlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Synopsis + episodes */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section aria-label="Synopsis">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
                About
              </h2>
              <p
                className="text-[var(--color-text-secondary)] leading-relaxed text-base"
                {...title.$?.synopsis}
                dangerouslySetInnerHTML={{ __html: title.synopsis }}
              />
            </section>

            {/* Episode list for series */}
            {series && (
              <section aria-label="Episodes">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
                  Episodes
                </h2>
                <div className="flex flex-col gap-4">
                  {series.seasons.map((season) => (
                    <details
                      key={season.uid}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] overflow-hidden"
                    >
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] transition-colors list-none focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)]">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          Season {season.season_number}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            {season.episodes.length} episodes
                          </span>
                          <ChevronDown
                            className="h-4 w-4 text-[var(--color-text-secondary)] transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </div>
                      </summary>
                      <div className="divide-y divide-[var(--color-border)]">
                        {season.episodes.map((ep) => (
                          <div
                            key={ep.uid}
                            className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--color-bg-elevated)] transition-colors"
                          >
                            <div className="flex-shrink-0 relative w-24 aspect-video rounded-lg overflow-hidden bg-[var(--color-bg-elevated)]">
                              {ep.thumbnail && (
                                <Image
                                  src={ep.thumbnail.url}
                                  alt={ep.title}
                                  fill
                                  className="object-cover"
                                  {...ep.$?.thumbnail}
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50">
                                <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-text-disabled)]">
                                  E{ep.episode_number}
                                </span>
                                <h3 className="font-semibold text-sm text-[var(--color-text-primary)] truncate" {...ep.$?.title}>
                                  {ep.title}
                                </h3>
                                <span className="ml-auto text-xs text-[var(--color-text-disabled)] shrink-0">
                                  {formatRuntime(ep.duration)}
                                </span>
                              </div>
                              <p
                                className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-2"
                                {...ep.$?.synopsis}
                                dangerouslySetInnerHTML={{ __html: ep.synopsis }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {title.tags.length > 0 && (
              <section aria-label="Tags">
                <h2 className="sr-only">Tags</h2>
                <div className="flex gap-2 flex-wrap">
                  {title.tags.map((tag) => (
                    <Badge key={tag} variant="default">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: cast & meta */}
          <aside
            aria-label="Title metadata"
            className="flex flex-col gap-6"
            data-cs-entry={title.uid}
            data-cs-content-type="person"
          >
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
              <h2 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm uppercase tracking-wider">
                Cast & Crew
              </h2>
              <dl className="flex flex-col gap-4">
                {(() => {
                  const lead = isMovie ? movie?.director : series?.creator;
                  if (!lead) return null;
                  return (
                    <div>
                      <dt className="text-xs text-[var(--color-text-disabled)] mb-1">
                        {isMovie ? "Director" : "Creator"}
                      </dt>
                      <dd>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
                            {lead.photo && (
                              <Image
                                src={lead.photo.url}
                                alt={lead.name}
                                width={32}
                                height={32}
                                className="object-cover"
                                {...lead.$?.photo}
                              />
                            )}
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)] font-medium" {...lead.$?.title}>
                            {lead.name}
                          </span>
                        </div>
                      </dd>
                    </div>
                  );
                })()}
                <div>
                  <dt className="text-xs text-[var(--color-text-disabled)] mb-2">Cast</dt>
                  <dd>
                    <ul className="flex flex-col gap-2" role="list">
                      {title.cast.map((person) => (
                        <li key={person.uid} className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-[var(--color-bg-elevated)] flex-shrink-0">
                            {person.photo && (
                              <Image
                                src={person.photo.url}
                                alt={person.name}
                                width={32}
                                height={32}
                                className="object-cover"
                                {...person.$?.photo}
                              />
                            )}
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)]" {...person.$?.title}>
                            {person.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Quick meta */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5">
              <h2 className="font-semibold text-[var(--color-text-primary)] mb-4 text-sm uppercase tracking-wider">
                Details
              </h2>
              <dl className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-[var(--color-text-disabled)]">Release</dt>
                  <dd className="text-sm text-[var(--color-text-primary)] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[var(--color-text-disabled)]" aria-hidden="true" />
                    {new Date(title.release_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-[var(--color-text-disabled)]">Rating</dt>
                  <dd className={cn("text-sm font-mono font-semibold", getRatingColor(title.rating))}>
                    {title.rating}
                  </dd>
                </div>
                {movie && (
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-[var(--color-text-disabled)]">Runtime</dt>
                    <dd className="text-sm text-[var(--color-text-primary)]">
                      {formatRuntime(movie.runtime)}
                    </dd>
                  </div>
                )}
                {series && (
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-[var(--color-text-disabled)]">Status</dt>
                    <dd className="text-sm text-[var(--color-text-primary)] capitalize">
                      {series.status}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-[var(--color-text-disabled)]">Tier</dt>
                  <dd>
                    <Badge variant={title.content_tier === "premium" ? "premium" : "default"} className="capitalize">
                      {title.content_tier}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        {/* Related titles */}
        {related.length > 0 && (
          <section className="mt-12" aria-label="Related titles">
            <Rail
              rail={{
                uid: `related-${title.uid}`,
                title: "You Might Also Like",
                rail_type: "automated",
                items: related,
                layout: "landscape",
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
