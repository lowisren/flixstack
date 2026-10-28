import Image from "next/image";
import { cn } from "@/lib/utils";
import { gutterX } from "../tokens/layout";
import { Eyebrow } from "../primitives/eyebrow";
import { Heading } from "../primitives/heading";
import type { Genre } from "@/lib/types";

/** The banner at the top of a genre page: artwork, identity tint and title. */
export function GenreBanner({ genre }: { genre: Genre }) {
  return (
    <section
      className="hud-frame relative h-48 sm:h-64 overflow-hidden bg-media-ground"
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
          heroes. The copy below is on-media white, so its contrast must not
          depend on color_accent — that field is editor-chosen in Contentstack,
          and a light accent (e.g. a yellow "Comedy") took the heading to 3.40:1
          in dark mode when the text sat directly on the tint. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${genre.color_accent}80, transparent)`,
        }}
        aria-hidden="true"
      />
      <div className="hero-scrim scanlines absolute inset-0" aria-hidden="true" />
      <div className={cn("relative h-full flex flex-col justify-end pb-8", gutterX)}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="h-1 w-8"
            style={{ backgroundColor: genre.color_accent }}
            aria-hidden="true"
          />
          <Eyebrow as="span" tone="media" tracking="widest">
            Genre
          </Eyebrow>
        </div>
        <Heading as="h1" size="4xl" tone="media" className="chromatic" {...genre.$?.title}>
          {genre.title}
        </Heading>
        <p className="text-on-media/85 mt-1 max-w-xl" {...genre.$?.description}>
          {genre.description}
        </p>
      </div>
    </section>
  );
}
