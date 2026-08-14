"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TitleCard } from "./title-card";
import { cn } from "@/lib/utils";
import type { HomepageRail } from "@/lib/types";

interface RailProps {
  rail: HomepageRail;
  "data-cs-entry"?: string;
}

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-baseline gap-2 min-w-0">
          {/* Sibling of the h2, not inside it, so the Contentstack live-preview
              edit tag stays bound to the title text alone. */}
          {/* Braced string, not a bare `//` text node — as raw JSX text it is
              indistinguishable from a comment (react/jsx-no-comment-textnodes). */}
          <span className="font-mono text-sm text-accent shrink-0" aria-hidden="true">
            {"//"}
          </span>
          <h2
            className="font-display text-lg uppercase text-text-primary truncate"
            {...rail.$?.title}
          >
            {rail.title}
          </h2>
        </div>
        <div className="flex items-center gap-1" aria-label={`Scroll ${rail.title}`}>
          <button
            onClick={() => scroll("left")}
            className={cn(
              "notch-sm flex h-8 w-8 items-center justify-center",
              "border border-border-control bg-surface",
              "text-text-secondary hover:border-accent hover:text-accent",
              "transition-colors"
            )}
            aria-label={`Scroll ${rail.title} left`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => scroll("right")}
            className={cn(
              "notch-sm flex h-8 w-8 items-center justify-center",
              "border border-border-control bg-surface",
              "text-text-secondary hover:border-accent hover:text-accent",
              "transition-colors"
            )}
            aria-label={`Scroll ${rail.title} right`}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Scrollable rail */}
      <div
        ref={scrollRef}
        className="scroll-rail rail-fade flex gap-4 px-4 sm:px-6 lg:px-8 pb-4"
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
