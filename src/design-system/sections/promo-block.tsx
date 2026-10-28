import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { gutterMx, gutterX } from "../tokens/layout";
import { Heading } from "../primitives/heading";
import { Panel } from "../primitives/panel";
import type { PromoBlock as PromoBlockData } from "@/lib/types";

/** Editorial promo with headline, body, CTA and optional image (`promo_block`). */
export function PromoBlock({ promo }: { promo: PromoBlockData }) {
  const isReversed = promo.layout === "right";
  return (
    <Panel
      data-cs-entry={promo.uid}
      data-cs-content-type="promo_block"
      className={cn(
        "flex flex-col md:flex-row gap-8 items-center py-8",
        isReversed && "md:flex-row-reverse",
        gutterX,
        gutterMx
      )}
    >
      <div className="flex-1 max-w-xl">
        <Heading as="h2" size="2xl" className="mb-3">
          {promo.headline}
        </Heading>
        <p className="text-text-secondary leading-relaxed mb-5">{promo.body}</p>
        {/* Not <Button>: Button adds a 1px border, which would make this CTA
            2px taller. Converting it is a logged follow-up (strict parity). */}
        <Link
          href={promo.cta_url}
          className="notch-sm inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground font-mono font-semibold text-xs uppercase tracking-wider hover:bg-accent-hover transition-colors"
        >
          {promo.cta_label}
        </Link>
      </div>
      {promo.image && (
        <div className="notch flex-1 relative aspect-video w-full max-w-md overflow-hidden">
          <Image src={promo.image.url} alt={promo.headline} fill className="object-cover" />
        </div>
      )}
    </Panel>
  );
}
