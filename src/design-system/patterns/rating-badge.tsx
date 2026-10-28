import { Badge } from "../primitives/badge";
import { cn, getRatingColor } from "@/lib/utils";

/**
 * Content rating (G, PG, PG-13, R, TV-MA) as a badge. The colour comes from
 * `getRatingColor`, which maps each rating to a design token verified at
 * >= 4.5:1 on every surface by check-contrast.mjs. The rating text itself
 * always carries the meaning; colour only reinforces it.
 */
export function RatingBadge({
  rating,
  className,
  ...props
}: { rating: string } & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <Badge variant="rating" className={cn(getRatingColor(rating), className)} {...props}>
      {rating}
    </Badge>
  );
}
