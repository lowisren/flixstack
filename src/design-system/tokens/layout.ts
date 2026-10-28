/**
 * Layout tokens as Tailwind class strings, not CSS custom properties.
 *
 * The page gutter is responsive (three breakpoints), which a single custom
 * property cannot express, and keeping these as ordinary utilities means
 * `cn()` / tailwind-merge still resolves conflicts — a consumer can pass
 * `px-0` and win, which a custom @utility would not allow.
 */

/** Horizontal page gutter. Every edge-aligned block uses this so content lines up. */
export const gutterX = "px-4 sm:px-6 lg:px-8";

/** Inline margin matching the gutter, for blocks inset from the page edge. */
export const gutterMx = "mx-4 sm:mx-6 lg:mx-8";

/** Page container widths. `wide` is the default for listing and detail pages. */
export const containers = {
  wide: "mx-auto max-w-screen-2xl",
  default: "mx-auto max-w-screen-xl",
  narrow: "mx-auto max-w-5xl",
  compact: "mx-auto max-w-md",
} as const;

export type ContainerWidth = keyof typeof containers;
