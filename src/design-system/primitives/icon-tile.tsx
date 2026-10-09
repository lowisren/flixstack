import { cn } from "@/lib/utils";

/**
 * A notched, non-interactive square that frames an icon or a short glyph —
 * the logo mark, a setup step number, a feature icon. Decorative by default
 * context; pass `aria-hidden` where the tile duplicates nearby text.
 */
const toneClasses = {
  accent: "bg-accent text-accent-foreground",
  subtle: "bg-accent-subtle",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
};

export interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses;
  size?: keyof typeof sizeClasses;
  as?: "span" | "div";
}

export function IconTile({ tone = "accent", size = "sm", as: Tag = "span", className, ...props }: IconTileProps) {
  return (
    <Tag
      className={cn("notch-sm flex items-center justify-center", sizeClasses[size], toneClasses[tone], className)}
      {...props}
    />
  );
}
