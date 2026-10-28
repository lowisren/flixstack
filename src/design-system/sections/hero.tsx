"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { gutterX } from "../tokens/layout";
import { Button } from "../primitives/button";
import { Badge } from "../primitives/badge";
import { Heading } from "../primitives/heading";
import { CarouselControls } from "../patterns/carousel-controls";
import { CarouselDots } from "../patterns/carousel-dots";
import type { HeroBanner } from "@/lib/types";

interface HeroProps {
  banners: HeroBanner[];
}

/** Rotating featured-title banner (`hero_block`). */
export function Hero({ banners }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  const prev = () => {
    setCurrent((c) => (c - 1 + banners.length) % banners.length);
  };

  // Auto-rotate unless paused (respects prefers-reduced-motion in CSS)
  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, banners.length, next]);

  const banner = banners[current];

  // No banners published (e.g. an environment with no hero content) — render nothing
  // rather than crashing on `banner.*`. Guard sits after all hooks to keep hook order stable.
  if (!banner) return null;

  return (
    <section
      aria-label="Featured content"
      aria-live="polite"
      aria-atomic="true"
      // Fixed dark ground, not bg-elevated: the copy is white in both themes,
      // so a theme-following surface would put white text on a light ground.
      className="hud-frame relative w-full h-[60vh] min-h-100 max-h-175 overflow-hidden bg-media-ground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image */}
      {banner.background_image && (
        <Image
          src={banner.background_image.url}
          alt=""
          fill
          className="object-cover transition-opacity duration-700"
          priority
          {...banner.$?.background_image}
        />
      )}

      {/* Three-layer scrim: horizontal wash + bottom vignette (both in
          .hero-scrim, at a fixed dark ink) plus scanlines. Worst case over
          pure-white artwork is 10.21:1 for the title and 7.23:1 for the
          subtitle, so the copy never depends on the CMS supplying a dark image. */}
      <div className="hero-scrim scanlines absolute inset-0" aria-hidden="true" />

      {/* Content */}
      <div className={cn("relative h-full flex items-end pb-12", gutterX)}>
        <div className="max-w-xl">
          {banner.badge_text && (
            <Badge variant="accent" className="mb-3">
              {banner.badge_text}
            </Badge>
          )}
          <Heading
            as="h1"
            size="3xl"
            tone="media"
            className="chromatic sm:text-4xl md:text-5xl leading-tight mb-3"
            {...banner.$?.title}
          >
            {banner.title}
          </Heading>
          <p
            className="text-on-media/85 text-base sm:text-lg mb-6 leading-relaxed line-clamp-2"
            {...banner.$?.subtitle}
          >
            {banner.subtitle}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button size="lg" asChild className="gap-2">
              <Link href={banner.cta_url}>
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                {banner.cta_label}
              </Link>
            </Button>
            {banner.linked_title && (
              <Button variant="media" size="lg" asChild className="gap-2">
                <Link href={`/watch/${banner.linked_title.slug}`}>
                  <Info className="h-5 w-5" aria-hidden="true" />
                  More Info
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation controls sit top-right, out of the copy's column. The copy
          is bottom-anchored and its height is CMS-driven, so on short viewports
          its top edge rises past the vertical midpoint — centred side arrows
          overlapped the badge and h1. The top-right is always clear. */}
      {banners.length > 1 && (
        <>
          <CarouselControls
            variant="media"
            className="absolute top-4 right-4 z-10"
            onPrevious={prev}
            onNext={next}
            previousLabel="Previous featured title"
            nextLabel="Next featured title"
          />

          {/* `right-14`, not `right-8`: the .hud-frame corner bracket occupies
              14–40px in from the right edge; 56px clears it with a 16px gap. */}
          <CarouselDots
            className="absolute bottom-4 right-14"
            label="Featured content slides"
            slides={banners.map((b, i) => ({ key: b.uid, label: `Slide ${i + 1}: ${b.title}` }))}
            current={current}
            onSelect={setCurrent}
          />
        </>
      )}
    </section>
  );
}
