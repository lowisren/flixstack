"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { gutterX } from "../tokens/layout";
import { SectionHeader } from "../patterns/section-header";
import { CarouselControls } from "../patterns/carousel-controls";
import { TitleCard } from "./title-card";
import type { HomepageRail } from "@/lib/types";

interface RailProps {
  rail: HomepageRail;
  "data-cs-entry"?: string;
}

/** A titled, horizontally scrolling row of title cards (`rail_block`). */
export function Rail({ rail, ...props }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section
      aria-label={rail.title}
      className="relative"
      data-cs-entry={props["data-cs-entry"]}
    >
      <SectionHeader
        title={rail.title}
        editable={rail.$?.title}
        className={gutterX}
        actions={
          <CarouselControls
            aria-label={`Scroll ${rail.title}`}
            onPrevious={() => scroll("left")}
            onNext={() => scroll("right")}
            previousLabel={`Scroll ${rail.title} left`}
            nextLabel={`Scroll ${rail.title} right`}
          />
        }
      />

      {/* Scrollable rail */}
      <div
        ref={scrollRef}
        className={cn("scroll-rail rail-fade flex gap-4 pb-4", gutterX)}
        role="list"
        aria-label={`${rail.title} titles`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") scroll("right");
          if (e.key === "ArrowLeft") scroll("left");
        }}
      >
        {rail.items.map((title) => (
          <div key={title.uid} role="listitem" className="snap-start">
            <TitleCard
              title={title}
              layout={rail.layout === "hero" ? "landscape" : rail.layout}
              data-cs-entry={title.uid}
              data-cs-content-type={title.content_type}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
