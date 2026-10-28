// ============================================================
// Studio component schemas — pure data, no React.
//
// What Studio shows for each registered component: palette name and group,
// thumbnail, and the prop schema (types, options, defaults). Shared by:
//   - src/studio/register.ts, which pairs each schema with its adapter component
//   - scripts/studio/seed-compositions.ts, which writes every registered prop when
//     it authors sections, so Studio's Settings panel never shows a blank field
// Keep it free of component imports so the seed script can load it under tsx.
// ============================================================

import type { RegisterComponentOptionsInput } from "@contentstack/studio-react";
import { thumbnails } from "./thumbnails";

type Schema = Omit<RegisterComponentOptionsInput, "type" | "component">;

const ELEMENTS = "FlixStack · Elements";
const LAYOUT = "FlixStack · Layout";
const PATTERNS = "FlixStack · Patterns";

// Option lists mirror the design system's own scales.
const GAPS = ["none", "xs", "sm", "md", "lg", "xl"];
const ALIGN = ["start", "center", "end", "stretch"];

export const COMPONENT_SCHEMAS = {
  // ── Elements ─────────────────────────────────────────────────────────
  "flix-heading": {
    displayName: "Heading",
    description: "A display heading for section and page titles.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.heading,
    props: {
      text: { type: "string", displayName: "Text", defaultValue: "Heading" },
      level: {
        type: "choice",
        displayName: "Level",
        helpText: "The heading's place in the page outline. Use one H1 per page.",
        options: ["h1", "h2", "h3", "h4"],
        defaultValue: ["h2"],
        control: "dropdown",
      },
      size: {
        type: "choice",
        displayName: "Size",
        options: ["sm", "base", "lg", "xl", "2xl", "3xl", "4xl"],
        defaultValue: ["2xl"],
        control: "dropdown",
      },
      tone: { type: "choice", displayName: "Tone", helpText: "Use Media on top of artwork.", options: ["default", "media"], defaultValue: ["default"] },
      uppercase: { type: "boolean", displayName: "Uppercase", defaultValue: true },
    },
  },
  "flix-eyebrow": {
    displayName: "Eyebrow",
    description: "A short mono label above a heading.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.eyebrow,
    props: {
      text: { type: "string", displayName: "Text", defaultValue: "Now streaming" },
      tone: {
        type: "choice",
        displayName: "Tone",
        options: ["accent", "secondary", "primary", "signal", "media"],
        defaultValue: ["accent"],
        control: "dropdown",
      },
      marker: { type: "boolean", displayName: "Show // marker", defaultValue: false },
    },
  },
  "flix-text": {
    displayName: "Text",
    description: "Plain body copy.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.text,
    props: {
      text: { type: "plaintext", displayName: "Text", defaultValue: "Body copy goes here." },
      size: { type: "choice", displayName: "Size", options: ["sm", "base", "lg"], defaultValue: ["base"] },
      tone: { type: "choice", displayName: "Tone", options: ["secondary", "primary"], defaultValue: ["secondary"] },
    },
  },
  "flix-rich-text": {
    displayName: "Rich text",
    description: "Formatted copy from a rich text field, such as a synopsis.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.richText,
    props: {
      body: { type: "json_rte", displayName: "Body" },
      size: { type: "choice", displayName: "Size", options: ["sm", "base", "lg"], defaultValue: ["base"] },
    },
  },
  "flix-image": {
    displayName: "Image",
    description: "An image at a fixed aspect ratio, cropped to fill.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.image,
    props: {
      src: { type: "imageurl", displayName: "Image" },
      alt: {
        type: "string",
        displayName: "Alt text",
        helpText: "Describe the image for people who can't see it. Leave empty only if it's decorative.",
        defaultValue: "",
      },
      aspect: { type: "choice", displayName: "Aspect ratio", options: ["landscape", "portrait", "square", "wide"], defaultValue: ["landscape"] },
      notched: { type: "boolean", displayName: "Notched corners", defaultValue: false },
    },
  },
  "flix-badge": {
    displayName: "Badge",
    description: "A small label, such as New or Premium.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.badge,
    props: {
      text: { type: "string", displayName: "Text", defaultValue: "New" },
      variant: {
        type: "choice",
        displayName: "Style",
        options: ["accent", "default", "info", "signal", "premium", "outline"],
        defaultValue: ["accent"],
        control: "dropdown",
      },
    },
  },
  "flix-button-link": {
    displayName: "Button link",
    description: "A call to action that links somewhere.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.buttonLink,
    props: {
      label: { type: "string", displayName: "Label", defaultValue: "Watch now" },
      href: { type: "href", displayName: "Link", placeholder: "/watch/...", defaultValue: "/browse" },
      variant: {
        type: "choice",
        displayName: "Style",
        helpText: "Use Media on top of artwork.",
        options: ["primary", "secondary", "outline", "terminal", "media"],
        defaultValue: ["primary"],
        control: "dropdown",
      },
      size: { type: "choice", displayName: "Size", options: ["sm", "md", "lg"], defaultValue: ["md"] },
      newTab: { type: "boolean", displayName: "Open in a new tab", defaultValue: false },
    },
  },
  "flix-rating-badge": {
    displayName: "Content rating",
    description: "A title's content rating, such as PG-13.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.ratingBadge,
    props: {
      rating: { type: "string", displayName: "Rating", defaultValue: "PG-13" },
    },
  },
  "flix-score": {
    displayName: "Score",
    description: "An audience score out of 100.",
    sections: ELEMENTS,
    thumbnailUrl: thumbnails.score,
    props: {
      value: { type: "number", displayName: "Score", min: 0, max: 100, defaultValue: 87 },
      size: { type: "choice", displayName: "Size", helpText: "Hero adds /100, for use on artwork.", options: ["compact", "hero"], defaultValue: ["compact"] },
    },
  },

  // ── Layout ───────────────────────────────────────────────────────────
  "flix-section-shell": {
    displayName: "Section shell",
    description: "The outer wrapper of a page section: page width, gutter and vertical spacing.",
    sections: LAYOUT,
    thumbnailUrl: thumbnails.sectionShell,
    props: {
      children: { type: "slot", displayName: "Content" },
      width: {
        type: "choice",
        displayName: "Width",
        helpText: "Full runs edge to edge; the others line up with the header.",
        options: ["wide", "default", "narrow", "compact", "full"],
        defaultValue: ["wide"],
        control: "dropdown",
      },
      padding: { type: "choice", displayName: "Vertical spacing", options: ["none", "sm", "md", "lg"], defaultValue: ["md"] },
    },
  },
  "flix-stack": {
    displayName: "Stack",
    description: "Items in a vertical column with even spacing.",
    sections: LAYOUT,
    thumbnailUrl: thumbnails.stack,
    props: {
      children: { type: "slot", displayName: "Items" },
      gap: { type: "choice", displayName: "Spacing", options: GAPS, defaultValue: ["sm"], control: "dropdown" },
      align: { type: "choice", displayName: "Align", options: ALIGN, defaultValue: ["stretch"] },
    },
  },
  "flix-row": {
    displayName: "Row",
    description: "Items side by side with even spacing.",
    sections: LAYOUT,
    thumbnailUrl: thumbnails.row,
    props: {
      children: { type: "slot", displayName: "Items" },
      gap: { type: "choice", displayName: "Spacing", options: GAPS, defaultValue: ["sm"], control: "dropdown" },
      align: { type: "choice", displayName: "Align", options: [...ALIGN, "baseline"], defaultValue: ["center"], control: "dropdown" },
      justify: { type: "choice", displayName: "Justify", options: ["start", "center", "end", "between"], defaultValue: ["start"], control: "dropdown" },
      wrap: { type: "boolean", displayName: "Wrap onto new lines", defaultValue: false },
      collapse: {
        type: "boolean",
        displayName: "Stack on mobile",
        helpText: "Below 768px, place the items one above the other, each full width.",
        defaultValue: false,
      },
      reverse: {
        type: "boolean",
        displayName: "Reverse on desktop",
        helpText: "Show the items in reverse order from 768px up (e.g. image on the right).",
        defaultValue: false,
      },
    },
  },
  "flix-grid": {
    displayName: "Grid",
    description: "Items in equal responsive columns.",
    sections: LAYOUT,
    thumbnailUrl: thumbnails.grid,
    props: {
      children: { type: "slot", displayName: "Items" },
      columns: {
        type: "choice",
        displayName: "Columns",
        helpText: "The count on wide screens; narrower screens use fewer.",
        options: ["1", "2", "3", "4", "6"],
        defaultValue: ["3"],
      },
      gap: { type: "choice", displayName: "Spacing", options: GAPS, defaultValue: ["md"], control: "dropdown" },
    },
  },
  "flix-panel": {
    displayName: "Panel",
    description: "A notched surface for cards and callouts.",
    sections: LAYOUT,
    thumbnailUrl: thumbnails.panel,
    props: {
      children: { type: "slot", displayName: "Content" },
      padding: { type: "choice", displayName: "Padding", options: ["none", "sm", "md"], defaultValue: ["md"] },
      border: { type: "choice", displayName: "Border", options: ["divider", "control"], defaultValue: ["divider"] },
      scanlines: { type: "boolean", displayName: "Scanlines", defaultValue: false },
    },
  },

  // ── Patterns ─────────────────────────────────────────────────────────
  "flix-hero-carousel": {
    displayName: "Hero carousel",
    description: "The rotating full-width hero. Bind it to a list of hero banners.",
    sections: PATTERNS,
    thumbnailUrl: thumbnails.heroCarousel,
    props: {
      banners: {
        type: "array",
        displayName: "Hero banners",
        helpText: "A reference field to Hero Banner entries.",
        items: { type: "any" },
      },
    },
  },
  "flix-title-rail": {
    displayName: "Title rail",
    description: "A titled, horizontally scrolling row of movies and series.",
    sections: PATTERNS,
    thumbnailUrl: thumbnails.titleRail,
    props: {
      title: { type: "string", displayName: "Title", defaultValue: "Trending now" },
      items: {
        type: "array",
        displayName: "Titles",
        helpText: "A reference field to Movie or TV Series entries.",
        items: { type: "any" },
      },
      layout: { type: "choice", displayName: "Card shape", options: ["landscape", "portrait"], defaultValue: ["landscape"] },
    },
  },
  "flix-title-grid": {
    displayName: "Title grid",
    description: "Movies and series in a responsive grid.",
    sections: PATTERNS,
    thumbnailUrl: thumbnails.titleGrid,
    props: {
      items: {
        type: "array",
        displayName: "Titles",
        helpText: "A reference field to Movie or TV Series entries.",
        items: { type: "any" },
      },
      columns: {
        type: "choice",
        displayName: "Layout",
        options: ["portrait-5", "portrait-4", "portrait-6", "landscape-4"],
        defaultValue: ["portrait-5"],
        control: "dropdown",
      },
      label: {
        type: "string",
        displayName: "List name",
        helpText: "Read out by screen readers, e.g. “Horror picks”.",
        defaultValue: "",
      },
    },
  },
  "flix-title-card": {
    displayName: "Title card",
    description: "One movie or series as a card that links to its page.",
    sections: PATTERNS,
    thumbnailUrl: thumbnails.titleCard,
    props: {
      title: {
        type: "array",
        displayName: "Title",
        helpText: "A single reference to a Movie or TV Series entry.",
        items: { type: "any" },
      },
      layout: { type: "choice", displayName: "Card shape", options: ["portrait", "landscape"], defaultValue: ["portrait"] },
    },
  },
} satisfies Record<string, Schema>;

export type ComponentType = keyof typeof COMPONENT_SCHEMAS;
