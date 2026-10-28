import { cn } from "@/lib/utils";

export interface CarouselDotsProps {
  /** One entry per slide; `label` names the slide for assistive tech. */
  slides: { key: string; label: string }[];
  current: number;
  onSelect: (index: number) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
}

/**
 * Slide indicators as a tablist. The active dot is wider as well as accent
 * coloured, so the current slide is not shown by colour alone. Sits on
 * artwork, so the inactive dots use the on-media tone.
 */
export function CarouselDots({ slides, current, onSelect, label, className }: CarouselDotsProps) {
  return (
    <div className={cn("flex gap-2", className)} role="tablist" aria-label={label}>
      {slides.map((slide, i) => (
        <button
          key={slide.key}
          type="button"
          role="tab"
          aria-selected={i === current}
          aria-label={slide.label}
          onClick={() => onSelect(i)}
          className={cn(
            "h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-(--color-focus-ring)",
            i === current ? "w-6 bg-accent" : "w-2 bg-on-media/40 hover:bg-on-media/60"
          )}
        />
      ))}
    </div>
  );
}
