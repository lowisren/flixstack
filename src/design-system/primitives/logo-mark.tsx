import { Play } from "lucide-react";
import { IconTile } from "./icon-tile";

/**
 * The Flixstack mark — a play glyph in a notched accent tile. Always
 * decorative: the link that wraps it carries the site name as its label.
 */
export function LogoMark() {
  return (
    <IconTile tone="accent" size="sm" aria-hidden="true">
      <Play className="h-4 w-4 fill-accent-foreground text-accent-foreground" />
    </IconTile>
  );
}
