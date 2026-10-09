import { GenreSpotlight, Hero, PromoBlock, Rail } from "@/design-system";
import type { ModularBlock } from "@/lib/types";

interface ModularBlockRendererProps {
  blocks: ModularBlock[];
}

// ContentStack modular blocks are rendered dynamically based on block_type.
// Each block maps to a design-system section, so content editors compose page
// layouts without engineering changes. The block → section mapping is also
// listed on /design-system.
export function ModularBlockRenderer({ blocks }: ModularBlockRendererProps) {
  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block, i) => {
        switch (block.block_type) {
          case "hero_block":
            return (
              <section key={`hero-${i}`}>
                <Hero banners={block.data} />
              </section>
            );

          case "rail_block":
            return <Rail key={`rail-${i}`} rail={block.data} data-cs-entry={block.data.uid} />;

          case "promo_block":
            return <PromoBlock key={`promo-${i}`} promo={block.data} />;

          case "genre_spotlight_block":
            return <GenreSpotlight key={`genre-${i}`} spotlight={block.data} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
