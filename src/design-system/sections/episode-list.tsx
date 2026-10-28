import Image from "next/image";
import { ChevronDown, Play } from "lucide-react";
import { cn, formatRuntime } from "@/lib/utils";
import { Badge } from "../primitives/badge";
import { Eyebrow } from "../primitives/eyebrow";
import { Heading } from "../primitives/heading";
import { Panel } from "../primitives/panel";
import type { Episode, Season } from "@/lib/types";

export interface EpisodeListProps {
  seasons: Season[];
  /** uid of the episode currently playing, if any. */
  playingUid?: string;
  onPlay: (episode: Episode) => void;
}

/**
 * Seasons as native `<details>` disclosures, each listing its episodes with a
 * play thumbnail. Native disclosure keeps keyboard and screen-reader behaviour
 * without any script.
 */
export function EpisodeList({ seasons, playingUid, onPlay }: EpisodeListProps) {
  return (
    <div className="flex flex-col gap-4">
      {seasons.map((season) => (
        <Panel as="details" key={season.uid} className="group overflow-hidden">
          <summary className="focus-inset flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-elevated transition-colors list-none">
            <Heading as="span">Season {season.season_number}</Heading>
            <div className="flex items-center gap-3">
              <Eyebrow as="span" className="tabular-nums">
                {season.episodes.length} episodes
              </Eyebrow>
              <ChevronDown
                className="h-4 w-4 text-text-secondary transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </div>
          </summary>
          <div className="divide-y divide-border">
            {season.episodes.map((ep) => (
              <EpisodeRow key={ep.uid} episode={ep} active={playingUid === ep.uid} onPlay={onPlay} />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function EpisodeRow({ episode: ep, active, onPlay }: { episode: Episode; active: boolean; onPlay: (ep: Episode) => void }) {
  const playable = Boolean(ep.playback);
  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 transition-colors",
        active ? "bg-elevated" : "hover:bg-elevated"
      )}
    >
      <button
        type="button"
        onClick={() => onPlay(ep)}
        disabled={!playable}
        aria-label={playable ? `Play ${ep.title}` : `${ep.title} — no video available`}
        title={playable ? undefined : "No video available yet"}
        className="focus-inset notch-sm group/ep shrink-0 relative w-24 aspect-video overflow-hidden bg-elevated disabled:cursor-not-allowed"
      >
        {ep.thumbnail && (
          <Image src={ep.thumbnail.url} alt={ep.title} fill className="object-cover" {...ep.$?.thumbnail} />
        )}
        {playable && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-media-shade/50 transition-opacity",
              active ? "opacity-100" : "opacity-0 group-hover/ep:opacity-100"
            )}
          >
            <Play className="h-4 w-4 fill-on-media text-on-media" aria-hidden="true" />
          </div>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-accent tabular-nums">E{ep.episode_number}</span>
          <Heading as="h3" size="sm" uppercase={false} className="truncate" {...ep.$?.title}>
            {ep.title}
          </Heading>
          {active && (
            <Badge variant="signal" className="shrink-0">
              Now Playing
            </Badge>
          )}
          <span className="ml-auto font-mono text-xs text-text-secondary shrink-0 tabular-nums">
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
}
