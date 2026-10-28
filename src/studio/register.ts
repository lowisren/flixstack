// ============================================================
// Studio component registry
//
// Everything Studio can place on the canvas is registered here. Must only ever be
// imported from the client graph (app/studio-init.tsx, studio/studio-page.tsx,
// studio/studio-canvas.tsx): registering from a Server Component leaves the browser
// registry empty and every component renders as "Component Loading Error".
//
// Each entry pairs with an adapter in ./components that spreads `studioAttributes`
// on its root, which is what `wrap: false` relies on. Keep the three counts equal:
//   registerComponents entries = `wrap: false` = adapters spreading studioAttributes
//
// Components are eager, not lazy: the adapters wrap design-system components the
// app already ships, so a lazy chunk would only add a loading flash.
// ============================================================

import { registerBreakpoints, registerComponents } from "@contentstack/studio-react";
import {
  StudioBadge,
  StudioButtonLink,
  StudioEyebrow,
  StudioHeading,
  StudioImage,
  StudioRatingBadge,
  StudioRichText,
  StudioScore,
  StudioText,
} from "./components/atoms";
import { StudioGrid, StudioPanel, StudioRow, StudioSectionShell, StudioStack } from "./components/layout";
import { StudioHeroCarousel, StudioTitleCard, StudioTitleGrid, StudioTitleRail } from "./components/composites";
import { thumbnails } from "./thumbnails";

const ELEMENTS = "FlixStack · Elements";
const LAYOUT = "FlixStack · Layout";
const PATTERNS = "FlixStack · Patterns";

// Option lists mirror the design system's own scales.
const GAPS = ["none", "xs", "sm", "md", "lg", "xl"];
const ALIGN = ["start", "center", "end", "stretch"];

registerComponents(
  [
    // ── Elements ───────────────────────────────────────────────────────
    {
      type: "flix-heading",
      component: StudioHeading,
      wrap: false,
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
    {
      type: "flix-eyebrow",
      component: StudioEyebrow,
      wrap: false,
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
    {
      type: "flix-text",
      component: StudioText,
      wrap: false,
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
    {
      type: "flix-rich-text",
      component: StudioRichText,
      wrap: false,
      displayName: "Rich text",
      description: "Formatted copy from a rich text field, such as a synopsis.",
      sections: ELEMENTS,
      thumbnailUrl: thumbnails.richText,
      props: {
        body: { type: "json_rte", displayName: "Body" },
        size: { type: "choice", displayName: "Size", options: ["sm", "base", "lg"], defaultValue: ["base"] },
      },
    },
    {
      type: "flix-image",
      component: StudioImage,
      wrap: false,
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
    {
      type: "flix-badge",
      component: StudioBadge,
      wrap: false,
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
    {
      type: "flix-button-link",
      component: StudioButtonLink,
      wrap: false,
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
    {
      type: "flix-rating-badge",
      component: StudioRatingBadge,
      wrap: false,
      displayName: "Content rating",
      description: "A title's content rating, such as PG-13.",
      sections: ELEMENTS,
      thumbnailUrl: thumbnails.ratingBadge,
      props: {
        rating: { type: "string", displayName: "Rating", defaultValue: "PG-13" },
      },
    },
    {
      type: "flix-score",
      component: StudioScore,
      wrap: false,
      displayName: "Score",
      description: "An audience score out of 100.",
      sections: ELEMENTS,
      thumbnailUrl: thumbnails.score,
      props: {
        value: { type: "number", displayName: "Score", min: 0, max: 100, defaultValue: 87 },
        size: { type: "choice", displayName: "Size", helpText: "Hero adds /100, for use on artwork.", options: ["compact", "hero"], defaultValue: ["compact"] },
      },
    },

    // ── Layout ─────────────────────────────────────────────────────────
    {
      type: "flix-section-shell",
      component: StudioSectionShell,
      wrap: false,
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
    {
      type: "flix-stack",
      component: StudioStack,
      wrap: false,
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
    {
      type: "flix-row",
      component: StudioRow,
      wrap: false,
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
    {
      type: "flix-grid",
      component: StudioGrid,
      wrap: false,
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
    {
      type: "flix-panel",
      component: StudioPanel,
      wrap: false,
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

    // ── Patterns ───────────────────────────────────────────────────────
    {
      type: "flix-hero-carousel",
      component: StudioHeroCarousel,
      wrap: false,
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
    {
      type: "flix-title-rail",
      component: StudioTitleRail,
      wrap: false,
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
    {
      type: "flix-title-grid",
      component: StudioTitleGrid,
      wrap: false,
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
    {
      type: "flix-title-card",
      component: StudioTitleCard,
      wrap: false,
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
  ],
  // Throw on a duplicate type instead of silently keeping the first registration.
  { strict: true }
);

// Canvas preview sizes, matched to the Tailwind breakpoints the components use
// (md = 768px, lg = 1024px). The first entry is the base and takes no query.
registerBreakpoints([
  { id: "default", displayName: "Desktop", previewSize: { width: 1440, height: 900 } },
  { id: "tablet", displayName: "Tablet", query: "(max-width: 1023px)", previewSize: { width: 768, height: 1024 } },
  { id: "mobile", displayName: "Mobile", query: "(max-width: 767px)", previewSize: { width: 390, height: 844 } },
]);
