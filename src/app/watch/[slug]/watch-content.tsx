"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Star, Clock, Calendar, ChevronDown, Tv, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rail } from "@/components/streaming/rail";
import { VideoPlayer } from "@/components/streaming/video-player";
import { formatRuntime, getRatingColor, cn } from "@/lib/utils";
import type { Episode, Movie, Playback, Title, TvSeries } from "@/lib/types";

interface NowPlaying {
  playback: Playback;
  label: string;
  poster?: string;
  episodeUid?: string; // set when playing a series episode
}

export function WatchContent({ title, related }: { title: Title; related: Title[] }) {
  const isMovie = title.content_type === "movie";
  const movie = isMovie ? (title as Movie) : null;
  const series = !isMovie ? (title as TvSeries) : null;

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  const heroPoster = title.hero_image?.url;
  const firstPlayableEpisode = series?.seasons.flatMap((s) => s.episodes).find((e) => e.playback);
  const canPlay = isMovie ? Boolean(movie?.playback) : Boolean(firstPlayableEpisode);

  const playMovie = () => {
    if (movie?.playback) setNowPlaying({ playback: movie.playback, label: movie.title, poster: heroPoster });
  };
  const playEpisode = (ep: Episode) => {
    if (!ep.playback) return;
    setNowPlaying({
      playback: ep.playback,
      label: `${title.title} — ${ep.title}`,
      poster: ep.thumbnail?.url ?? heroPoster,
      episodeUid: ep.uid,
    });
  };
  const playPrimary = () => {
    if (isMovie) playMovie();
    else if (firstPlayableEpisode) playEpisode(firstPlayableEpisode);
  };

  const primaryLabel = isMovie
    ? "Play Movie"
    : firstPlayableEpisode
      ? `Play Episode ${firstPlayableEpisode.episode_number}`
      : "Play";

  return (
    <div>
      {/* Hero — replaced by the inline player while something is playing */}
      {nowPlaying ? (
        <section
          className="relative w-full h-[55vh] min-h-95 bg-black"
          aria-label={`Now playing: ${nowPlaying.label}`}
        >
          <VideoPlayer
            playback={nowPlaying.playback}
            poster={nowPlaying.poster}
            label={nowPlaying.label}
            className="w-full h-full object-contain bg-black"
          />
          <button
            type="button"
            onClick={() => setNowPlaying(null)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Close player
          </button>
        </section>
      ) : (
        <section
          className="relative w-full h-[55vh] min-h-95 overflow-hidden bg-elevated"
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
            className="absolute inset-0 bg-linear-to-r from-black/80 via-black/50 to-transparent"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent"
            aria-hidden="true"
          />

          {/* Content overlay */}
          <div className="relative h-full flex items-end pb-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-end gap-6">
              {/* Thumbnail */}
              <div className="hidden sm:block w-32 rounded-xl overflow-hidden shadow-2xl shrink-0 border border-white/10">
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
                  {title.content_tier === "premium" && <Badge variant="premium">Premium</Badge>}
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
                  <span className="flex items-center gap-1 text-accent font-semibold">
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                    <span aria-label={`Score: ${title.score} out of 100`}>{title.score}</span>
                    <span className="text-white/40 text-sm font-normal">/100</span>
                  </span>
                  {title.genres.map((g) => (
                    <Link
                      key={g.uid}
                      href={`/genre/${g.slug}`}
                      className="text-sm text-white/60 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-(--color-focus-ring) rounded-sm"
                    >
                      {g.title}
                    </Link>
                  ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={playPrimary}
                    disabled={!canPlay}
                    title={canPlay ? undefined : "No video available yet"}
                  >
                    <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                    {primaryLabel}
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
      )}

      {/* Details */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Synopsis + episodes */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <section aria-label="Synopsis">
              <h2 className="text-xl font-bold text-(--color-text-primary) mb-3">About</h2>
              <p
                className="text-text-secondary leading-relaxed text-base"
                {...title.$?.synopsis}
                dangerouslySetInnerHTML={{ __html: title.synopsis }}
              />
            </section>

            {/* Episode list for series */}
            {series && (
              <section aria-label="Episodes">
                <h2 className="text-xl font-bold text-(--color-text-primary) mb-4">Episodes</h2>
                <div className="flex flex-col gap-4">
                  {series.seasons.map((season) => (
                    <details
                      key={season.uid}
                      className="group rounded-xl border border-border bg-surface overflow-hidden"
                    >
                      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-elevated transition-colors list-none focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)">
                        <span className="font-semibold text-(--color-text-primary)">
                          Season {season.season_number}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-secondary">
                            {season.episodes.length} episodes
                          </span>
                          <ChevronDown
                            className="h-4 w-4 text-text-secondary transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </div>
                      </summary>
                      <div className="divide-y divide-border">
                        {season.episodes.map((ep) => {
                          const playable = Boolean(ep.playback);
                          const active = nowPlaying?.episodeUid === ep.uid;
                          return (
                            <div
                              key={ep.uid}
                              className={cn(
                                "flex items-start gap-4 px-5 py-4 transition-colors",
                                active
                                  ? "bg-elevated"
                                  : "hover:bg-elevated"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => playEpisode(ep)}
                                disabled={!playable}
                                aria-label={
                                  playable ? `Play ${ep.title}` : `${ep.title} — no video available`
                                }
                                title={playable ? undefined : "No video available yet"}
                                className="group/ep shrink-0 relative w-24 aspect-video rounded-lg overflow-hidden bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) disabled:cursor-not-allowed"
                              >
                                {ep.thumbnail && (
                                  <Image
                                    src={ep.thumbnail.url}
                                    alt={ep.title}
                                    fill
                                    className="object-cover"
                                    {...ep.$?.thumbnail}
                                  />
                                )}
                                {playable && (
                                  <div
                                    className={cn(
                                      "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity",
                                      active ? "opacity-100" : "opacity-0 group-hover/ep:opacity-100"
                                    )}
                                  >
                                    <Play className="h-4 w-4 fill-white text-white" aria-hidden="true" />
                                  </div>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-text-disabled">
                                    E{ep.episode_number}
                                  </span>
                                  <h3
                                    className="font-semibold text-sm text-(--color-text-primary) truncate"
                                    {...ep.$?.title}
                                  >
                                    {ep.title}
                                  </h3>
                                  {active && (
                                    <Badge variant="default" className="shrink-0">
                                      Now Playing
                                    </Badge>
                                  )}
                                  <span className="ml-auto text-xs text-text-disabled shrink-0">
                                    {formatRuntime(ep.duration)}
                                  </span>
                                </div>
                                <p
                                  className="text-xs text-text-secondary mt-1 line-clamp-2"
                                  {...ep.$?.synopsis}
                                  dangerouslySetInnerHTML={{ __html: ep.synopsis }}
                                />
                              </div>
                            </div>
                          );
                        })}
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
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-(--color-text-primary) mb-4 text-sm uppercase tracking-wider">
                Cast & Crew
              </h2>
              <dl className="flex flex-col gap-4">
                {(() => {
                  const lead = isMovie ? movie?.director : series?.creator;
                  if (!lead) return null;
                  return (
                    <div>
                      <dt className="text-xs text-text-disabled mb-1">
                        {isMovie ? "Director" : "Creator"}
                      </dt>
                      <dd>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-elevated shrink-0">
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
                          <span
                            className="text-sm text-(--color-text-primary) font-medium"
                            {...lead.$?.title}
                          >
                            {lead.name}
                          </span>
                        </div>
                      </dd>
                    </div>
                  );
                })()}
                <div>
                  <dt className="text-xs text-text-disabled mb-2">Cast</dt>
                  <dd>
                    <ul className="flex flex-col gap-2" role="list">
                      {title.cast.map((person) => (
                        <li key={person.uid} className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-elevated shrink-0">
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
                          <span className="text-sm text-(--color-text-primary)" {...person.$?.title}>
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
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-(--color-text-primary) mb-4 text-sm uppercase tracking-wider">
                Details
              </h2>
              <dl className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-text-disabled">Release</dt>
                  <dd className="text-sm text-(--color-text-primary) flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-text-disabled" aria-hidden="true" />
                    {new Date(title.release_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-text-disabled">Rating</dt>
                  <dd className={cn("text-sm font-mono font-semibold", getRatingColor(title.rating))}>
                    {title.rating}
                  </dd>
                </div>
                {movie && (
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-text-disabled">Runtime</dt>
                    <dd className="text-sm text-(--color-text-primary)">
                      {formatRuntime(movie.runtime)}
                    </dd>
                  </div>
                )}
                {series && (
                  <div className="flex justify-between items-center">
                    <dt className="text-xs text-text-disabled">Status</dt>
                    <dd className="text-sm text-(--color-text-primary) capitalize">{series.status}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="text-xs text-text-disabled">Tier</dt>
                  <dd>
                    <Badge
                      variant={title.content_tier === "premium" ? "premium" : "default"}
                      className="capitalize"
                    >
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
