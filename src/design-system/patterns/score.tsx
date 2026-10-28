import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScoreProps {
  /** Audience score, 0–100. */
  value: number;
  /**
   * `compact` — inline in a card's metadata row (inherits its mono voice).
   * `hero`    — on artwork in a title header, with a "/100" suffix.
   */
  size?: "compact" | "hero";
  className?: string;
}

/** Audience score with a star glyph. The number carries the full reading for assistive tech. */
export function Score({ value, size = "compact", className }: ScoreProps) {
  const hero = size === "hero";
  return (
    <span
      className={cn(
        "flex items-center text-accent",
        hero ? "gap-1 font-mono font-semibold tabular-nums" : "gap-0.5",
        className
      )}
    >
      <Star className={cn("fill-current", hero ? "h-4 w-4" : "h-3 w-3")} aria-hidden="true" />
      <span aria-label={`Score: ${value} out of 100`}>{value}</span>
      {hero && <span className="text-on-media/60 text-xs font-normal">/100</span>}
    </span>
  );
}
