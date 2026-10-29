// ============================================================
// Studio component registry
//
// Everything Studio can place on the canvas is registered here. Must only ever be
// imported from the client graph (app/studio-init.tsx, studio/studio-page.tsx,
// studio/studio-canvas.tsx): registering from a Server Component leaves the browser
// registry empty and every component renders as "Component Loading Error".
//
// Schemas (palette name, thumbnail, props) live in ./schemas.ts; this file pairs
// each one with its adapter in ./components. Every adapter spreads
// `studioAttributes` on its root, which is what `wrap: false` relies on.
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
import { COMPONENT_SCHEMAS, type ComponentType } from "./schemas";

type Adapter = Parameters<typeof registerComponents>[0][number]["component"];

// One adapter per schema; the type error here is what keeps the two in step.
const ADAPTERS: Record<ComponentType, Adapter> = {
  "flix-heading": StudioHeading,
  "flix-eyebrow": StudioEyebrow,
  "flix-text": StudioText,
  "flix-rich-text": StudioRichText,
  "flix-image": StudioImage,
  "flix-badge": StudioBadge,
  "flix-button-link": StudioButtonLink,
  "flix-rating-badge": StudioRatingBadge,
  "flix-score": StudioScore,
  "flix-section-shell": StudioSectionShell,
  "flix-stack": StudioStack,
  "flix-row": StudioRow,
  "flix-grid": StudioGrid,
  "flix-panel": StudioPanel,
  "flix-hero-carousel": StudioHeroCarousel,
  "flix-title-rail": StudioTitleRail,
  "flix-title-grid": StudioTitleGrid,
  "flix-title-card": StudioTitleCard,
};

registerComponents(
  (Object.keys(COMPONENT_SCHEMAS) as ComponentType[]).map((type) => ({
    type,
    component: ADAPTERS[type],
    wrap: false,
    ...COMPONENT_SCHEMAS[type],
  })),
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
