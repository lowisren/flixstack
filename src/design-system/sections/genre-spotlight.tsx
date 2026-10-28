import { gutterX } from "../tokens/layout";
import { Heading } from "../primitives/heading";
import { TextLink } from "../primitives/text-link";
import { Rail } from "./rail";
import type { GenreSpotlightBlock } from "@/lib/types";

/** A genre heading with its identity colour and a rail of its titles (`genre_spotlight_block`). */
export function GenreSpotlight({ spotlight }: { spotlight: GenreSpotlightBlock }) {
  return (
    <div data-cs-entry={spotlight.uid} data-cs-content-type="genre_spotlight_block" className={gutterX}>
      <div className="flex items-center gap-3 mb-4">
        {/* Editor-chosen colour, so it is decoration only — never behind text. */}
        <div
          className="h-6 w-1.5"
          style={{ backgroundColor: spotlight.genre.color_accent }}
          aria-hidden="true"
        />
        <Heading as="h2" size="xl">
          {spotlight.genre.title}
        </Heading>
        <TextLink variant="action" href={`/genre/${spotlight.genre.slug}`} className="ml-auto">
          View all →
        </TextLink>
      </div>
      <Rail
        rail={{
          uid: spotlight.uid,
          title: spotlight.genre.title,
          rail_type: "editorial",
          items: spotlight.items,
          layout: "landscape",
        }}
      />
    </div>
  );
}
