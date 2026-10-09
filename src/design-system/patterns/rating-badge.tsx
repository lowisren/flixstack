import { Badge } from "../primitives/badge";
import { getRatingColor } from "@/lib/utils";

/**
 * Content rating (G, PG, PG-13, R, TV-MA) as a badge. The colour comes from
 * `getRatingColor`, which maps each rating to a design token verified at
 * >= 4.5:1 on every surface by check-contrast.mjs. The rating text itself
 * always carries the meaning; colour only reinforces it.
 */
export function RatingBadge({ rating }: { rating: string }) {
  return (
    <Badge variant="rating" className={getRatingColor(rating)}>
      {rating}
    </Badge>
  );
}
