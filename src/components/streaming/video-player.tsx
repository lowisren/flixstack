"use client";

import { useRef } from "react";
import type { Playback } from "@/lib/types";

interface VideoPlayerProps {
  playback: Playback;
  /** Fallback poster (e.g. the title's hero image) when the field has none. */
  poster?: string;
  /** Accessible label describing what is playing, e.g. the movie or episode title. */
  label: string;
  /** Autoplay on mount — playback is always user-initiated (Play button/episode click). */
  autoPlay?: boolean;
  className?: string;
}

/**
 * Native HTML5 `<video>` player. Plays MP4 everywhere and HLS (`.m3u8`) natively
 * in Safari; no third-party player dependency. Prefers the external `url` source
 * and falls back to an uploaded `file`. Caption tracks render as `<track>`s.
 */
export function VideoPlayer({ playback, poster, label, autoPlay = true, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src = playback.url ?? playback.file?.url;

  if (!src) return null;

  // HLS manifests need an explicit MIME so Safari picks the right pipeline;
  // otherwise let the browser sniff (covers .mp4, .webm, uploaded files).
  const type = /\.m3u8($|\?)/i.test(src) ? "application/x-mpegURL" : undefined;
  const posterSrc = playback.poster?.url ?? poster;

  return (
    <video
      ref={videoRef}
      controls
      autoPlay={autoPlay}
      playsInline
      poster={posterSrc}
      aria-label={`Video player: ${label}`}
      className={className ?? "w-full h-full bg-black"}
    >
      <source src={src} type={type} />
      {playback.captions.map((c, i) => (
        <track
          key={`${c.srclang}-${i}`}
          kind="captions"
          src={c.src}
          srcLang={c.srclang}
          label={c.label}
          default={i === 0}
        />
      ))}
      Your browser does not support the video tag.
    </video>
  );
}
