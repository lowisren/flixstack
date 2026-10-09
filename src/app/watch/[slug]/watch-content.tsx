"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Badge,
  CreditsPanel,
  DetailTemplate,
  EpisodeList,
  Heading,
  Rail,
  TitleDetailHeader,
  TitleFactsPanel,
  VideoPlayer,
} from "@/design-system";
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
    <DetailTemplate
      hero={
        // The artwork header is replaced by the inline player while something plays.
        nowPlaying ? (
          <section
            className="relative w-full h-[55vh] min-h-95 bg-media-shade"
            aria-label={`Now playing: ${nowPlaying.label}`}
          >
            <VideoPlayer
              playback={nowPlaying.playback}
              poster={nowPlaying.poster}
              label={nowPlaying.label}
              className="w-full h-full object-contain bg-media-shade"
            />
            <button
              type="button"
              onClick={() => setNowPlaying(null)}
              className="notch-sm absolute top-4 right-4 z-10 flex items-center gap-1.5 border border-on-media/25 bg-media-shade/60 px-3 py-2 font-mono text-xs uppercase tracking-wider text-on-media backdrop-blur hover:border-accent hover:text-accent transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Close player
            </button>
          </section>
        ) : (
          <TitleDetailHeader title={title} playLabel={primaryLabel} canPlay={canPlay} onPlay={playPrimary} />
        )
      }
      main={
        <>
          <section aria-label="Synopsis">
            <Heading as="h2" size="xl" className="mb-3">
              About
            </Heading>
            <p
              className="text-text-secondary leading-relaxed text-base"
              {...title.$?.synopsis}
              dangerouslySetInnerHTML={{ __html: title.synopsis }}
            />
          </section>

          {series && (
            <section aria-label="Episodes">
              <Heading as="h2" size="xl" className="mb-4">
                Episodes
              </Heading>
              <EpisodeList seasons={series.seasons} playingUid={nowPlaying?.episodeUid} onPlay={playEpisode} />
            </section>
          )}

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
        </>
      }
      aside={
        <aside
          aria-label="Title metadata"
          className="flex flex-col gap-6"
          data-cs-entry={title.uid}
          data-cs-content-type="person"
        >
          <CreditsPanel
            lead={isMovie ? movie?.director : series?.creator}
            leadRole={isMovie ? "Director" : "Creator"}
            cast={title.cast}
          />
          <TitleFactsPanel title={title} />
        </aside>
      }
      after={
        related.length > 0 && (
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
        )
      }
    />
  );
}
