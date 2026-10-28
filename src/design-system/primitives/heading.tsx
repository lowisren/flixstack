import { cn } from "@/lib/utils";

/**
 * Display-face heading (Chakra Petch). Headings and short labels only — never
 * sentences or paragraphs.
 *
 * Uppercase is applied with text-transform, never by changing the source
 * string, so assistive tech reads normal-case text.
 *
 * The size scale is exactly the set of sizes in use today (strict-parity
 * refactor — merging it into a tighter scale is a logged follow-up). Pass
 * responsive steps through `className`, e.g. `sm:text-4xl md:text-5xl`.
 */
const sizeClasses = {
  sm: "text-sm",
  base: "",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
};

const toneClasses = {
  default: "text-text-primary",
  /** On artwork — always paired with the fixed dark scrim. */
  media: "text-on-media",
};

export type HeadingSize = keyof typeof sizeClasses;

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  size?: HeadingSize;
  tone?: keyof typeof toneClasses;
  uppercase?: boolean;
}

export function Heading({
  as: Tag = "h2",
  size = "base",
  tone = "default",
  uppercase = true,
  className,
  ...props
}: HeadingProps) {
  return (
    <Tag
      className={cn("font-display", sizeClasses[size], uppercase && "uppercase", toneClasses[tone], className)}
      {...props}
    />
  );
}
