import { Hero } from "@/components/streaming/hero";
import { Rail } from "@/components/streaming/rail";
import Link from "next/link";
import Image from "next/image";
import type { ModularBlock } from "@/lib/types";

interface ModularBlockRendererProps {
  blocks: ModularBlock[];
}

// ContentStack modular blocks are rendered dynamically based on block_type.
// Each block maps to a specific React component. This pattern lets
// content editors compose page layouts without engineering changes.
export function ModularBlockRenderer({ blocks }: ModularBlockRendererProps) {
  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block, i) => {
        switch (block.block_type) {
          case "hero_block":
            return (
              <section
                key={`hero-${i}`}
                data-cs-entry={block.data.uid}
                data-cs-content-type="hero_banner"
              >
                <Hero banners={[block.data]} />
              </section>
            );

          case "rail_block":
            return (
              <Rail
                key={`rail-${i}`}
                rail={block.data}
                data-cs-entry={block.data.uid}
              />
            );

          case "promo_block": {
            const promo = block.data;
            const isReversed = promo.layout === "right";
            return (
              <div
                key={`promo-${i}`}
                data-cs-entry={promo.uid}
                data-cs-content-type="promo_block"
                className={`flex flex-col md:flex-row ${isReversed ? "md:flex-row-reverse" : ""} gap-8 items-center px-4 sm:px-6 lg:px-8 py-8 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] mx-4 sm:mx-6 lg:mx-8`}
              >
                <div className="flex-1 max-w-xl">
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
                    {promo.headline}
                  </h2>
                  <p className="text-[var(--color-text-secondary)] leading-relaxed mb-5">
                    {promo.body}
                  </p>
                  <Link
                    href={promo.cta_url}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-semibold text-sm hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    {promo.cta_label}
                  </Link>
                </div>
                <div className="flex-1 relative aspect-video w-full max-w-md rounded-xl overflow-hidden">
                  {promo.image && (
                    <Image
                      src={promo.image.url}
                      alt={promo.headline}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
              </div>
            );
          }

          case "genre_spotlight_block": {
            const spotlight = block.data;
            return (
              <div
                key={`genre-${i}`}
                data-cs-entry={spotlight.uid}
                data-cs-content-type="genre_spotlight_block"
                className="px-4 sm:px-6 lg:px-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-6 w-1.5 rounded-full"
                    style={{ backgroundColor: spotlight.genre.color_accent }}
                    aria-hidden="true"
                  />
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    {spotlight.genre.title}
                  </h2>
                  <Link
                    href={`/genre/${spotlight.genre.slug}`}
                    className="text-sm text-[var(--color-accent)] hover:underline ml-auto focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
                  >
                    View all →
                  </Link>
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

          default:
            return null;
        }
      })}
    </div>
  );
}
