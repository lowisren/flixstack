"use client";

// Atoms: each renders one piece of content bound to one field.
//
// Every adapter follows the same contract (docs/studio-plan.md §4):
//   - `studioAttributes` spread LAST on the root DOM element (registered `wrap: false`)
//   - a `$<prop>` edit tag spread on the element that renders that prop
//   - empty values still render their element when bound, so a new entry's empty
//     field stays clickable in Visual Editor

import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Badge, Button, Eyebrow, FallbackImage, Heading, RatingBadge, Score, SlashMarker } from "@/design-system";
import type { BadgeProps, HeadingProps, HeadingSize } from "@/design-system";
import { cn } from "@/lib/utils";
import { choice, imageUrl, type Cslptag, type ImageValue, type StudioAttributes } from "../props";

type Choice<T extends string> = T | T[];

// ── Heading ────────────────────────────────────────────────────────────

export interface StudioHeadingProps extends StudioAttributes {
  text?: string;
  level?: Choice<"h1" | "h2" | "h3" | "h4">;
  size?: Choice<HeadingSize>;
  tone?: Choice<NonNullable<HeadingProps["tone"]>>;
  uppercase?: boolean;
  $text?: Cslptag;
}

export function StudioHeading({ text, level, size, tone, uppercase = true, $text, studioAttributes }: StudioHeadingProps) {
  return (
    <Heading
      as={choice(level, "h2")}
      size={choice(size, "2xl")}
      tone={choice(tone, "default")}
      uppercase={uppercase}
      {...$text}
      {...studioAttributes}
    >
      {text}
    </Heading>
  );
}

// ── Eyebrow ────────────────────────────────────────────────────────────

export interface StudioEyebrowProps extends StudioAttributes {
  text?: string;
  tone?: Choice<"secondary" | "primary" | "accent" | "signal" | "media">;
  /** Prefix with the `//` marker used on section titles. */
  marker?: boolean;
  $text?: Cslptag;
}

export function StudioEyebrow({ text, tone, marker = false, $text, studioAttributes }: StudioEyebrowProps) {
  return (
    <Eyebrow tone={choice(tone, "accent")} {...studioAttributes}>
      {marker && <SlashMarker trailingSpace />}
      <span {...$text}>{text}</span>
    </Eyebrow>
  );
}

// ── Text ───────────────────────────────────────────────────────────────

const textSizeClasses = { sm: "text-sm", base: "text-base", lg: "text-lg" };
const textToneClasses = { primary: "text-text-primary", secondary: "text-text-secondary" };

export interface StudioTextProps extends StudioAttributes {
  text?: string;
  size?: Choice<keyof typeof textSizeClasses>;
  tone?: Choice<keyof typeof textToneClasses>;
  $text?: Cslptag;
}

/** Plain body copy. Line breaks in the source are kept. */
export function StudioText({ text, size, tone, $text, studioAttributes }: StudioTextProps) {
  return (
    <p
      className={cn(
        "whitespace-pre-line leading-relaxed",
        textSizeClasses[choice(size, "base")],
        textToneClasses[choice(tone, "secondary")]
      )}
      {...$text}
      {...studioAttributes}
    >
      {text}
    </p>
  );
}

// ── Rich text ──────────────────────────────────────────────────────────

export interface StudioRichTextProps extends StudioAttributes {
  /** Studio serializes a bound rich-text field (JSON RTE, HTML RTE, Markdown) to HTML. */
  body?: string;
  size?: Choice<keyof typeof textSizeClasses>;
  $body?: Cslptag;
}

/** Rich text from an RTE field, e.g. a title's synopsis. */
export function StudioRichText({ body, size, $body, studioAttributes }: StudioRichTextProps) {
  return (
    <div className="min-w-0" {...studioAttributes}>
      <div
        className={cn(
          "leading-relaxed text-text-secondary [&_a]:text-accent [&_a]:underline [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5",
          textSizeClasses[choice(size, "base")]
        )}
        {...$body}
        dangerouslySetInnerHTML={{ __html: typeof body === "string" ? body : "" }}
      />
    </div>
  );
}

// ── Image ──────────────────────────────────────────────────────────────

const aspectClasses = {
  landscape: "aspect-video",
  portrait: "aspect-[2/3]",
  square: "aspect-square",
  wide: "aspect-[21/9]",
};

/** Hosts next.config.ts lets next/image optimise; anything else is served as-is. */
function isOptimisable(src: string) {
  try {
    return new URL(src).hostname.endsWith(".contentstack.io");
  } catch {
    return false;
  }
}

export interface StudioImageProps extends StudioAttributes {
  src?: ImageValue;
  alt?: string;
  aspect?: Choice<keyof typeof aspectClasses>;
  /** Cut the corners like the app's panels and cards. */
  notched?: boolean;
  $src?: Cslptag;
}

export function StudioImage({ src, alt = "", aspect, notched = false, $src, studioAttributes }: StudioImageProps) {
  const url = imageUrl(src);
  const placeholder = (
    <div className="absolute inset-0 flex items-center justify-center bg-elevated">
      <ImageOff className="h-8 w-8 text-text-disabled" aria-hidden="true" />
    </div>
  );
  return (
    <div
      className={cn("relative w-full overflow-hidden bg-elevated", aspectClasses[choice(aspect, "landscape")], notched && "notch")}
      {...studioAttributes}
    >
      <div className="absolute inset-0" {...$src}>
        {url ? (
          <FallbackImage
            src={url}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            unoptimized={!isOptimisable(url)}
            fallback={placeholder}
          />
        ) : (
          placeholder
        )}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────

export interface StudioBadgeProps extends StudioAttributes {
  text?: string;
  variant?: Choice<NonNullable<BadgeProps["variant"]>>;
  $text?: Cslptag;
}

export function StudioBadge({ text, variant, $text, studioAttributes }: StudioBadgeProps) {
  return (
    <span className="inline-flex" {...studioAttributes}>
      <Badge variant={choice(variant, "accent")} {...$text}>
        {text}
      </Badge>
    </span>
  );
}

// ── Button link ────────────────────────────────────────────────────────

export interface StudioButtonLinkProps extends StudioAttributes {
  label?: string;
  href?: string;
  variant?: Choice<"primary" | "secondary" | "outline" | "terminal" | "media">;
  size?: Choice<"sm" | "md" | "lg">;
  newTab?: boolean;
  $label?: Cslptag;
}

/** A link styled as a button, for calls to action. */
export function StudioButtonLink({ label, href, variant, size, newTab = false, $label, studioAttributes }: StudioButtonLinkProps) {
  return (
    <span className="inline-flex" {...studioAttributes}>
      <Button asChild variant={choice(variant, "primary")} size={choice(size, "md")}>
        <Link href={href || "#"} {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          <span {...$label}>{label}</span>
        </Link>
      </Button>
    </span>
  );
}

// ── Rating badge ───────────────────────────────────────────────────────

export interface StudioRatingBadgeProps extends StudioAttributes {
  rating?: string;
  $rating?: Cslptag;
}

/** A content rating (PG-13, TV-MA…); renders nothing visible when empty. */
export function StudioRatingBadge({ rating, $rating, studioAttributes }: StudioRatingBadgeProps) {
  return (
    <span className="inline-flex" {...studioAttributes}>
      {rating ? <RatingBadge rating={rating} {...$rating} /> : <span {...$rating} />}
    </span>
  );
}

// ── Score ──────────────────────────────────────────────────────────────

export interface StudioScoreProps extends StudioAttributes {
  value?: number;
  size?: Choice<"compact" | "hero">;
  $value?: Cslptag;
}

/** An audience score out of 100 with a star; renders nothing visible when empty. */
export function StudioScore({ value, size, $value, studioAttributes }: StudioScoreProps) {
  return (
    <span className="inline-flex" {...studioAttributes}>
      {typeof value === "number" ? <Score value={value} size={choice(size, "compact")} {...$value} /> : <span {...$value} />}
    </span>
  );
}
