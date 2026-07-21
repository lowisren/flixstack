"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HeroBanner } from "@/lib/types";

interface HeroProps {
  banners: HeroBanner[];
}

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
      className="relative w-full h-[60vh] min-h-100 max-h-175 overflow-hidden bg-elevated"
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

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative h-full flex items-end pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl">
          {banner.badge_text && (
            <Badge variant="accent" className="mb-3">
              {banner.badge_text}
            </Badge>
          )}
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-3"
            {...banner.$?.title}
          >
            {banner.title}
          </h1>
          <p
            className="text-white/80 text-base sm:text-lg mb-6 leading-relaxed line-clamp-2"
            {...banner.$?.subtitle}
          >
            {banner.subtitle}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="lg"
              asChild
              className="gap-2"
            >
              <Link href={banner.cta_url}>
                <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                {banner.cta_label}
              </Link>
            </Button>
            {banner.linked_title && (
              <Button
                variant="secondary"
                size="lg"
                asChild
                className="gap-2 bg-white/20 text-white border-white/30 hover:bg-white/30"
              >
                <Link href={`/watch/${banner.linked_title.slug}`}>
                  <Info className="h-5 w-5" aria-hidden="true" />
                  More Info
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-black/40 text-white hover:bg-black/60 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)"
            )}
            aria-label="Previous featured title"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            onClick={next}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2",
              "flex h-10 w-10 items-center justify-center rounded-full",
              "bg-black/40 text-white hover:bg-black/60 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)"
            )}
            aria-label="Next featured title"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Dot indicators */}
          <div
            className="absolute bottom-4 right-8 flex gap-2"
            role="tablist"
            aria-label="Featured content slides"
          >
            {banners.map((b, i) => (
              <button
                key={b.uid}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}: ${b.title}`}
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)",
                  i === current
                    ? "w-6 bg-accent"
                    : "w-2 bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
