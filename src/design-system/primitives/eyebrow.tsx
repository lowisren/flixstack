import { cn } from "@/lib/utils";

/**
 * The terminal label voice: mono, extra-small, uppercase, tracked out. Used
 * for field labels, panel titles, readouts and status lines.
 */
const toneClasses = {
  secondary: "text-text-secondary",
  primary: "text-text-primary",
  accent: "text-accent",
  signal: "text-signal",
  /** On artwork. */
  media: "text-on-media/70",
};

export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  as?: "p" | "span" | "h2" | "h3" | "dt";
  tone?: keyof typeof toneClasses;
  tracking?: "wider" | "widest";
  weight?: "normal" | "semibold";
}

export function Eyebrow({
  as: Tag = "p",
  tone = "secondary",
  tracking = "wider",
  weight = "normal",
  className,
  ...props
}: EyebrowProps) {
  return (
    <Tag
      className={cn(
        "font-mono text-xs uppercase",
        tracking === "widest" ? "tracking-widest" : "tracking-wider",
        weight === "semibold" && "font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

/**
 * The `//` comment marker that prefixes section and panel titles. Decorative:
 * hidden from assistive tech so it is never read as "slash slash".
 */
export function SlashMarker({ className, trailingSpace = false }: { className?: string; trailingSpace?: boolean }) {
  return (
    <span className={cn("text-accent", className)} aria-hidden="true">
      {trailingSpace ? "// " : "//"}
    </span>
  );
}
