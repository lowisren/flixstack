#!/usr/bin/env tsx
// ============================================================
// Flixstack — Contentstack Studio compositions seed
//
// Writes the Studio sections and the "Collection page" template described in
// docs/studio-plan.md §7, as entries of the Studio project's compositions content
// type, then publishes them. Sections are written first: the template places them
// by entry uid.
//
// Sections are authored by API rather than in the Studio canvas, so this script
// writes everything the editor would otherwise write for itself:
//   - every registered prop on every node (from src/studio/schemas.ts), so the
//     Settings panel never shows a blank field
//   - the full node envelope (uid, type, props, metadata, slots, attrs, styles)
//   - choice values as lists, static values in the entry's static_value buckets
//   - linked_schemas, the scope each section binds against on a landing_page
//   - ui_preview, the palette thumbnail (a generated schematic — open a section in
//     Studio and Save to replace it with a real screenshot)
// The node shapes follow the contentstack-skills `author-composition-*` guides.
//
// Usage:
//   tsx scripts/studio/seed-compositions.ts [--dry] [--only=<key>] [--force-thumbnails]
//     --dry               build and validate every tree, print a summary, write nothing
//     --only=<key>        one composition, e.g. --only=promo or --only=collection-page
//     --force-thumbnails  regenerate ui_preview even where one is set
//
// Requires .env.local (override with ENV_FILE=.env.new):
//   NEXT_PUBLIC_CONTENTSTACK_API_KEY, CONTENTSTACK_MANAGEMENT_TOKEN
// Honors NEXT_PUBLIC_CONTENTSTACK_REGION, _ENVIRONMENT (the publish target) and
// NEXT_PUBLIC_CONTENTSTACK_STUDIO_CONTENT_TYPE (default "compositions").
//
// Idempotent: compositions are matched on composable_uid and updated in place.
// ============================================================

import * as path from "path";
import { deflateSync, inflateSync } from "zlib";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.env.ENV_FILE ?? ".env.local") });

import { COMPONENT_SCHEMAS, type ComponentType } from "../../src/studio/schemas";
import { thumbnails } from "../../src/studio/thumbnails";

// ─── env ─────────────────────────────────────────────────────

const API_KEY = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT ?? "development";
const REGION = (process.env.NEXT_PUBLIC_CONTENTSTACK_REGION ?? "US").toUpperCase();
const COMPOSITIONS_CT = process.env.NEXT_PUBLIC_CONTENTSTACK_STUDIO_CONTENT_TYPE || "compositions";
const PAGE_CT = "landing_page";
const LOCALE = "en-us";

const DRY = process.argv.includes("--dry") || process.env.DRY === "1";
const FORCE_THUMBNAILS = process.argv.includes("--force-thumbnails");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);

if (!API_KEY || !MGMT) {
  console.error("Missing NEXT_PUBLIC_CONTENTSTACK_API_KEY or CONTENTSTACK_MANAGEMENT_TOKEN in .env.local");
  process.exit(1);
}
if (ENVIRONMENT === "production") {
  // Production publishing is gated by the Editorial Review workflow, and this
  // build is development-only (docs/studio-plan.md). Refuse rather than half-publish.
  console.error("Refusing to publish Studio compositions to production from this script.");
  process.exit(1);
}

const CMA_HOST_MAP: Record<string, string> = {
  US: "api.contentstack.io",
  EU: "eu-api.contentstack.com",
  AU: "au-api.contentstack.com",
  AZURE_NA: "azure-na-api.contentstack.com",
  AZURE_EU: "azure-eu-api.contentstack.com",
  GCP_NA: "gcp-na-api.contentstack.com",
  GCP_EU: "gcp-eu-api.contentstack.com",
};
const CMA = `https://${CMA_HOST_MAP[REGION] ?? CMA_HOST_MAP.US}/v3`;

// ─── composition tree model ──────────────────────────────────

type Path = { [key: string]: Path };
type Binding =
  | { type: "static_value"; value: string }
  | { type: "template"; value: { path: Path } }
  | { type: "repeater"; value: { repeaterUID: string; path: Path } };

interface UINode {
  uid: string;
  type: string;
  attrs: Record<string, unknown>;
  metadata: Record<string, unknown>;
  styles: Record<string, unknown>;
  props: Record<string, unknown>;
  slots: Record<string, UINode[]>;
}

/** `bind("a.0.b")` → a template binding on the path a → 0 → b. */
const pathOf = (dotted: string): Path =>
  dotted === "" ? {} : dotted.split(".").reduceRight<Path>((inner, key) => ({ [key]: inner }), {});

type PropInput =
  | { bind: string } //                       template binding (section scope)
  | { repeat: [repeater: UINode, field: string] } // repeater-scope binding
  | string
  | number
  | boolean
  | string[];

const bind = (dotted: string): PropInput => ({ bind: dotted });
const repeat = (repeater: UINode, field: string): PropInput => ({ repeat: [repeater, field] });

const STATIC_BUCKETS = [
  "text", "plaintext", "html_rte", "array", "object", "number", "href", "textarea",
  "any", "json_rte", "datestring", "boolean", "imageurl", "choice",
] as const;
type Bucket = (typeof STATIC_BUCKETS)[number];

/** Which static_value bucket a prop type's literal lives in (`string` → `text`). */
function bucketFor(propType: string, control?: string): Bucket {
  if (propType === "string") return control === "large" ? "textarea" : "text";
  if ((STATIC_BUCKETS as readonly string[]).includes(propType)) return propType as Bucket;
  throw new Error(`No static_value bucket for prop type "${propType}"`);
}

const DEFAULT_STYLES = { default: { classes: [""], responsiveStyles: { default: {} } } };

class Composition {
  readonly staticValue: Record<Bucket, { key: string; value: unknown }[]> = Object.fromEntries(
    STATIC_BUCKETS.map((b) => [b, []])
  ) as unknown as Record<Bucket, { key: string; value: unknown }[]>;
  private readonly uids = new Set<string>();

  constructor(readonly key: string) {}

  private uid(name: string) {
    const uid = `${this.key}-${name}`;
    if (this.uids.has(uid)) throw new Error(`Duplicate node uid ${uid}`);
    this.uids.add(uid);
    return uid;
  }

  private meta(title: string, extra: Record<string, unknown> = {}) {
    return { title, visible: true, locked: false, ...extra };
  }

  /** A registered FlixStack component. Every schema prop is written. */
  component(type: ComponentType, name: string, title: string, inputs: Record<string, PropInput> = {}, children: UINode[] = []): UINode {
    const schema = COMPONENT_SCHEMAS[type].props as Record<string, { type: string; defaultValue?: unknown; control?: string; displayName?: string }>;
    for (const k of Object.keys(inputs)) if (!(k in schema)) throw new Error(`${type} has no prop "${k}"`);

    const uid = this.uid(name);
    const props: Record<string, unknown> = {};
    const slots: Record<string, UINode[]> = {};
    const slotNames: Record<string, string> = {};

    for (const [prop, def] of Object.entries(schema)) {
      if (def.type === "slot") {
        if (!children.length) throw new Error(`${uid}: slot "${prop}" would be empty`);
        const slotUid = `${uid}-${prop}`;
        props[prop] = { type: "slot", slot: slotUid };
        slots[slotUid] = children;
        slotNames[slotUid] = def.displayName ?? prop;
        continue;
      }
      const input = inputs[prop];
      if (input && typeof input === "object" && "bind" in input) {
        props[prop] = { type: def.type, binding: { type: "template", value: { path: pathOf(input.bind) } } satisfies Binding };
        continue;
      }
      if (input && typeof input === "object" && "repeat" in input) {
        const [repeater, field] = input.repeat;
        props[prop] = { type: def.type, binding: { type: "repeater", value: { repeaterUID: repeater.uid, path: pathOf(field) } } satisfies Binding };
        continue;
      }
      let value: unknown = input ?? def.defaultValue;
      if (value === undefined) continue; // no default and nothing bound: Studio leaves it unset too
      if (def.type === "choice" && !Array.isArray(value)) value = [value];
      if ((def.type === "array" || def.type === "object") && typeof value !== "string") value = JSON.stringify(value);
      const key = `${uid}-${prop}`;
      this.staticValue[bucketFor(def.type, def.control)].push({ key, value });
      props[prop] = { type: def.type, binding: { type: "static_value", value: key } satisfies Binding };
    }

    return {
      uid,
      type,
      attrs: {},
      metadata: this.meta(title, Object.keys(slotNames).length ? { slotNames } : {}),
      styles: DEFAULT_STYLES,
      props,
      slots,
    };
  }

  /** Built-in Repeater. `items` is a template path; children are filled in by `fill`. */
  repeater(name: string, title: string, items: string, fieldType?: "reference" | "modular_block"): UINode {
    const uid = this.uid(name);
    return {
      uid,
      type: "repeater",
      attrs: {},
      // "preview" renders every item on the canvas instead of one placeholder.
      metadata: this.meta(title, { mode: "preview", ...(fieldType ? { repeaterBindingFieldType: fieldType } : {}) }),
      styles: DEFAULT_STYLES,
      props: {
        items: { binding: { type: "template", value: { path: pathOf(items) } } satisfies Binding },
        children: { type: "slot", slot: `${uid}-items` },
      },
      slots: { [`${uid}-items`]: [] },
    };
  }

  /** Narrows a reference Repeater's item to one content type (required for references). */
  referenceCondition(name: string, title: string, repeater: UINode, contentTypeUid: string, children: UINode[]): UINode {
    const uid = this.uid(name);
    return {
      uid,
      type: "condition-block",
      attrs: {},
      metadata: this.meta(title, {
        condition: {
          type: "reference",
          operator: "eq",
          value: contentTypeUid,
          conditionBinding: { type: "repeater", value: { repeaterUID: repeater.uid, path: { _content_type_uid: {} } } },
        },
      }),
      styles: DEFAULT_STYLES,
      props: { children: { type: "slot", slot: `${uid}-children` } },
      slots: { [`${uid}-children`]: children },
    };
  }

  /** A Section Slot: an empty drop region the template fills per placement. */
  sectionSlot(name: string, title: string): UINode {
    const uid = this.uid(name);
    return { uid, type: "section-slot", attrs: {}, metadata: this.meta(title), styles: {}, props: {}, slots: { [uid]: [] } };
  }

  /**
   * A placed Section on a template. `selectedField` overrides the section's scope for
   * this placement (omit it to inherit the section's linked_schemas default);
   * `exposed` sets the section's exposed props, keyed by exposure uid. Their
   * static values live on the TEMPLATE entry.
   */
  sectionInstance(
    name: string,
    title: string,
    compositionUID: string,
    selectedField?: string,
    exposed: Record<string, { type: string; value: unknown }> = {}
  ): UINode {
    const uid = this.uid(name);
    const props: Record<string, unknown> = {};
    for (const [exposureUid, { type, value }] of Object.entries(exposed)) {
      const key = `${uid}-${exposureUid}`;
      this.staticValue[bucketFor(type)].push({ key, value });
      props[exposureUid] = { type, binding: { type: "static_value", value: key } satisfies Binding };
    }
    return {
      uid,
      type: "section-composition",
      attrs: {},
      metadata: this.meta(title, { compositionUID, ...(selectedField ? { sectionBindingOverride: { selectedField } } : {}) }),
      styles: DEFAULT_STYLES,
      props,
      slots: {},
    };
  }

  /** The `page` root every composition's ui must be. */
  root(children: UINode[], metadata: Record<string, unknown> = {}): UINode {
    const uid = this.uid("root");
    return {
      uid,
      type: "page",
      attrs: {},
      metadata: { sectionExposedProps: [], ...metadata },
      styles: {},
      props: { children: { type: "slot", slot: `${uid}-children` } },
      slots: { [`${uid}-children`]: children },
    };
  }
}

/** Puts children into a Repeater built with `Composition.repeater`. */
function fill(repeater: UINode, children: UINode[]): UINode {
  repeater.slots[`${repeater.uid}-items`] = children;
  return repeater;
}

// ─── preflight ───────────────────────────────────────────────

/** The checks the author-composition guides require before any write. */
function preflight(root: UINode, label: string) {
  const problems: string[] = [];
  if (root.type !== "page") problems.push("root node is not type \"page\"");
  const walk = (n: UINode, parentRepeater?: UINode) => {
    for (const k of ["uid", "type", "props", "metadata", "slots", "attrs", "styles"] as const)
      if (n[k] === undefined) problems.push(`${n.uid ?? "?"}: missing ${k}`);
    for (const [slotUid, kids] of Object.entries(n.slots ?? {})) {
      const legitEmpty = n.type === "section-slot" && slotUid === n.uid;
      if (!kids.length && !legitEmpty) problems.push(`${n.uid}: slot ${slotUid} is empty`);
    }
    const childrenProp = n.props?.children as { slot?: string } | undefined;
    if (childrenProp?.slot && !(childrenProp.slot in n.slots)) problems.push(`${n.uid}: props.children points at missing slot`);
    if (n.type === "repeater") {
      if (n.metadata.mode !== "preview") problems.push(`${n.uid}: repeater not in preview mode`);
      const kids = Object.values(n.slots).flat();
      if (n.metadata.repeaterBindingFieldType === "reference" && !kids.every((k) => k.type === "condition-block"))
        problems.push(`${n.uid}: reference repeater without a Condition Block child`);
    }
    for (const kid of Object.values(n.slots ?? {}).flat()) walk(kid, n.type === "repeater" ? n : parentRepeater);
  };
  walk(root);
  if (problems.length) throw new Error(`Preflight failed for ${label}:\n  ${problems.join("\n  ")}`);
}

const encodeUi = (root: UINode) => `zlib:${deflateSync(Buffer.from(JSON.stringify(root))).toString("base64")}`;
const decodeUi = (ui: string): UINode =>
  JSON.parse(ui.startsWith("zlib:") ? inflateSync(Buffer.from(ui.slice(5), "base64")).toString() : ui);

// ─── the sections (docs/studio-plan.md §7) ───────────────────

interface SectionDef {
  key: string;
  title: string;
  composableUid: string;
  description: string;
  linkedSchemas: { content_type_uid: string; selected_field?: string; display_name: string; cardinality?: "collection" | "single" }[];
  build: (c: Composition) => UINode;
  /** Glyph for the generated ui_preview. */
  glyph: string;
}

const linked = (displayName: string, selectedField?: string, cardinality?: "collection" | "single") => [
  { content_type_uid: PAGE_CT, display_name: displayName, ...(selectedField ? { selected_field: selectedField } : {}), ...(cardinality ? { cardinality } : {}) },
];

const SECTIONS: SectionDef[] = [
  {
    key: "hero-carousel",
    title: "Hero Carousel",
    composableUid: "flix_hero_carousel",
    description: "The rotating full-width hero, bound to the page's hero banners.",
    linkedSchemas: linked("Hero Banners", "hero_banners"),
    glyph: thumbnails.heroCarousel,
    build: (c) =>
      c.root([
        c.component("flix-section-shell", "shell", "Section shell — full bleed", { width: "full", padding: "none" }, [
          c.component("flix-hero-carousel", "carousel", "Hero carousel", { banners: bind("") }),
        ]),
      ]),
  },
  {
    key: "feature-callouts",
    title: "Feature Callouts",
    composableUid: "flix_feature_callouts",
    description: "Short feature highlights in a row of panels, one per callout.",
    linkedSchemas: linked("Callouts", "callouts", "collection"),
    glyph: thumbnails.grid,
    build: (c) => {
      const items = c.repeater("callouts", "Repeat — each callout", "");
      return c.root([
        c.component("flix-section-shell", "shell", "Section shell", { padding: "md" }, [
          c.component("flix-grid", "grid", "Grid — callouts", { columns: "3", gap: "sm" }, [
            fill(items, [
              c.component("flix-panel", "panel", "Panel — callout", { padding: "md" }, [
                c.component("flix-stack", "stack", "Stack — callout copy", { gap: "xs" }, [
                  c.component("flix-heading", "heading", "Heading — callout", { text: repeat(items, "heading"), level: "h3", size: "lg" }),
                  c.component("flix-text", "body", "Text — callout", { text: repeat(items, "body"), size: "sm" }),
                ]),
              ]),
            ]),
          ]),
        ]),
      ]);
    },
  },
  {
    key: "title-spotlight",
    title: "Title Spotlight",
    composableUid: "flix_title_spotlight",
    description: "One featured movie or series: artwork, rating, score, synopsis and a watch link.",
    // Whole-entry scope: a single reference arrives as a one-item array, and a
    // section's selected_field can't index into arrays — the bindings do instead.
    linkedSchemas: linked("Landing Page (featured title)"),
    glyph: thumbnails.titleCard,
    build: (c) => {
      const t = "featured_title.0";
      return c.root([
        c.component("flix-section-shell", "shell", "Section shell", { padding: "md" }, [
          c.component("flix-row", "row", "Row — artwork and details", { collapse: true, gap: "lg", align: "center" }, [
            c.component("flix-image", "artwork", "Image — title artwork", {
              src: bind(`${t}.artwork.hero_image.url`),
              alt: bind(`${t}.title`),
              aspect: "landscape",
              notched: true,
            }),
            c.component("flix-stack", "details", "Stack — title details", { gap: "sm", align: "start" }, [
              c.component("flix-eyebrow", "eyebrow", "Eyebrow — Featured", { text: "Featured tonight", marker: true }),
              c.component("flix-heading", "title", "Heading — title", { text: bind(`${t}.title`), level: "h2", size: "3xl" }),
              c.component("flix-row", "meta", "Row — rating and score", { gap: "xs" }, [
                c.component("flix-rating-badge", "rating", "Content rating", { rating: bind(`${t}.title_metadata.rating`) }),
                c.component("flix-score", "score", "Score", { value: bind(`${t}.title_metadata.score`) }),
              ]),
              c.component("flix-rich-text", "synopsis", "Rich text — synopsis", { body: bind(`${t}.synopsis`) }),
              c.component("flix-button-link", "watch", "Button link — Watch now", { label: "Watch now", href: bind(`${t}.url`) }),
            ]),
          ]),
        ]),
      ]);
    },
  },
  {
    key: "title-rails",
    title: "Title Rails",
    composableUid: "flix_title_rails",
    description: "One scrolling rail per Homepage Rail entry referenced by the page.",
    linkedSchemas: linked("Rails", "rails"),
    glyph: thumbnails.titleRail,
    build: (c) => {
      const rails = c.repeater("rails", "Repeat — each rail", "", "reference");
      return c.root([
        c.component("flix-section-shell", "shell", "Section shell — full bleed", { width: "full", padding: "sm" }, [
          c.component("flix-stack", "stack", "Stack — rails", { gap: "lg" }, [
            fill(rails, [
              c.referenceCondition("is-rail", "If Homepage Rail", rails, "homepage_rail", [
                c.component("flix-title-rail", "rail", "Title rail", { title: repeat(rails, "title"), items: repeat(rails, "items"), layout: "landscape" }),
              ]),
            ]),
          ]),
        ]),
      ]);
    },
  },
  {
    key: "promo",
    title: "Promo",
    composableUid: "flix_promo",
    description: "A promotional panel: image, eyebrow, headline, body and a call to action. The image side is set per page.",
    linkedSchemas: linked("Promo", "promo"),
    glyph: thumbnails.panel,
    build: (c) => {
      const row = c.component("flix-row", "row", "Row — image and copy", { collapse: true, gap: "lg", align: "center", reverse: false }, [
        c.component("flix-image", "image", "Image — promo", { src: bind("image.url"), alt: "", aspect: "landscape" }),
        c.component("flix-stack", "copy", "Stack — promo copy", { gap: "sm", align: "start" }, [
          c.component("flix-eyebrow", "eyebrow", "Eyebrow — promo", { text: bind("eyebrow") }),
          c.component("flix-heading", "headline", "Heading — promo", { text: bind("headline"), level: "h2", size: "2xl" }),
          c.component("flix-text", "body", "Text — promo", { text: bind("body") }),
          c.component("flix-button-link", "cta", "Button link — promo CTA", { label: bind("cta.label"), href: bind("cta.url") }),
        ]),
      ]);
      return c.root(
        [c.component("flix-section-shell", "shell", "Section shell", { padding: "md" }, [c.component("flix-panel", "panel", "Panel — promo", { padding: "md" }, [row])])],
        {
          // One Promo section serves both layouts: the template sets the side per placement.
          sectionExposedProps: [
            {
              nodeUid: row.uid,
              propKey: "reverse",
              uid: "promo-image-right",
              displayName: "Image on the right",
              propType: "boolean",
              bindingAtExposeTime: (row.props.reverse as { binding: Binding }).binding,
            },
          ],
        }
      );
    },
  },
  {
    key: "genre-spotlight",
    title: "Genre Spotlight",
    composableUid: "flix_genre_spotlight",
    description: "Spotlights one genre: artwork, name, description and a link to browse it.",
    // Whole-entry scope, for the same single-reference reason as Title Spotlight.
    linkedSchemas: linked("Landing Page (genre)"),
    glyph: thumbnails.image,
    build: (c) => {
      const g = "genre.0";
      return c.root([
        c.component("flix-section-shell", "shell", "Section shell", { padding: "md" }, [
          c.component("flix-panel", "panel", "Panel — genre", { padding: "md", scanlines: true }, [
            c.component("flix-row", "row", "Row — artwork and copy", { collapse: true, gap: "lg", align: "center" }, [
              c.component("flix-image", "artwork", "Image — genre artwork", { src: bind(`${g}.hero_image.url`), alt: "", aspect: "wide" }),
              c.component("flix-stack", "copy", "Stack — genre copy", { gap: "sm", align: "start" }, [
                c.component("flix-eyebrow", "eyebrow", "Eyebrow — Genre spotlight", { text: "Genre spotlight", marker: true }),
                c.component("flix-heading", "name", "Heading — genre", { text: bind(`${g}.title`), level: "h2", size: "3xl" }),
                c.component("flix-text", "description", "Text — genre description", { text: bind(`${g}.description`) }),
                c.component("flix-button-link", "browse", "Button link — Browse the genre", { label: "Browse the genre", href: bind(`${g}.url`), variant: "outline" }),
              ]),
            ]),
          ]),
        ]),
      ]);
    },
  },
  {
    key: "open-section",
    title: "Open Section",
    composableUid: "flix_open_section",
    description: "A titled section with a free drop area: authors place any component or section in it per page.",
    linkedSchemas: [],
    glyph: thumbnails.sectionShell,
    build: (c) =>
      c.root([
        c.component("flix-section-shell", "shell", "Section shell", { padding: "md" }, [
          c.component("flix-stack", "stack", "Stack — title and content", { gap: "md" }, [
            c.component("flix-heading", "heading", "Heading — section title", { text: "Section title", level: "h2", size: "2xl" }),
            c.sectionSlot("content", "Section slot — content"),
          ]),
        ]),
      ]),
  },
];

// ─── the template (docs/studio-plan.md §7) ───────────────────

interface Placement {
  section: string; // the section's composable_uid
  title: string;
  /** Per-placement scope; omitted for whole-entry sections. */
  selectedField?: string;
  exposed?: Record<string, { type: string; value: unknown }>;
}

interface TemplateDef {
  key: string;
  title: string;
  composableUid: string;
  contentType: string;
  /**
   * With `content_type_url_pattern`, Studio matches the request path against each
   * entry's stored `url` (here /collections/<slug>); the pattern itself is display
   * metadata and is not substituted. The literal prefix keeps it from claiming
   * other templates' URLs.
   */
  url: string;
  /** Reference fields to resolve, as CDA include paths on the page entry. */
  resolvedReferences: string[];
  placements: Placement[];
}

const TEMPLATES: TemplateDef[] = [
  {
    key: "collection-page",
    title: "Collection page",
    composableUid: "flix_collection_page",
    contentType: PAGE_CT,
    url: "/collections/{{entry.title}}",
    resolvedReferences: ["hero_banners", "hero_banners.linked_title", "featured_title", "rails", "rails.items", "genre"],
    placements: [
      { section: "flix_hero_carousel", title: "Hero Carousel", selectedField: "hero_banners" },
      { section: "flix_feature_callouts", title: "Feature Callouts", selectedField: "callouts" },
      { section: "flix_title_spotlight", title: "Title Spotlight" },
      { section: "flix_title_rails", title: "Title Rails", selectedField: "rails" },
      { section: "flix_promo", title: "Promo", selectedField: "promo", exposed: { "promo-image-right": { type: "boolean", value: false } } },
      { section: "flix_genre_spotlight", title: "Genre Spotlight" },
    ],
  },
];

// ─── CMA ─────────────────────────────────────────────────────

const headers = (json = true) => ({
  api_key: API_KEY!,
  authorization: MGMT!,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

async function cma<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`${CMA}${url}`, { method, headers: headers(), body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json)}`);
  return json as T;
}

interface StoredEntry {
  uid: string;
  ui_preview?: { uid: string; url: string } | null;
  publish_details?: { environment: string; locale: string }[];
  [key: string]: unknown;
}

async function findByComposableUid(composableUid: string): Promise<StoredEntry | undefined> {
  const q = encodeURIComponent(JSON.stringify({ composable_uid: composableUid }));
  const { entries } = await cma<{ entries: StoredEntry[] }>("GET", `/content_types/${COMPOSITIONS_CT}/entries?query=${q}&locale=${LOCALE}`);
  return entries[0];
}

async function getEnvironmentUid(name: string): Promise<string> {
  const { environment } = await cma<{ environment: { uid: string } }>("GET", `/environments/${name}`);
  return environment.uid;
}

async function publishEntry(uid: string) {
  await cma("POST", `/content_types/${COMPOSITIONS_CT}/entries/${uid}/publish`, {
    entry: { environments: [ENVIRONMENT], locales: [LOCALE] },
    locale: LOCALE,
  });
}

/** Uploads an SVG schematic as an asset, publishes it, returns its uid. */
async function uploadPreview(def: SectionDef): Promise<string> {
  const form = new FormData();
  form.append("asset[upload]", new Blob([previewSvg(def)], { type: "image/svg+xml" }), `studio-section-${def.key}.svg`);
  form.append("asset[title]", `Studio section preview: ${def.title}`);
  form.append("asset[description]", "Generated schematic (scripts/studio/seed-compositions.ts). Save the section in Studio to replace it with a screenshot.");
  const res = await fetch(`${CMA}/assets`, { method: "POST", headers: headers(false), body: form });
  const json = (await res.json()) as { asset?: { uid: string } };
  if (!res.ok || !json.asset) throw new Error(`asset upload → ${res.status} ${JSON.stringify(json)}`);
  await cma("POST", `/assets/${json.asset.uid}/publish`, { asset: { environments: [ENVIRONMENT], locales: [LOCALE] } });
  return json.asset.uid;
}

/** A 1440×810 schematic: the component glyph plus the section's name and binding. */
function previewSvg(def: SectionDef): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const scope = def.linkedSchemas[0]
    ? `${def.linkedSchemas[0].content_type_uid}${def.linkedSchemas[0].selected_field ? `.${def.linkedSchemas[0].selected_field}` : ""}`
    : "no schema · free drop area";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1440" height="810" viewBox="0 0 1440 810">
<rect width="1440" height="810" fill="#05070a"/>
<image x="420" y="120" width="600" height="400" href="${def.glyph}" xlink:href="${def.glyph}"/>
<text x="720" y="610" text-anchor="middle" font-family="monospace" font-size="56" font-weight="700" fill="#e6f1f5">${esc(def.title.toUpperCase())}</text>
<text x="720" y="670" text-anchor="middle" font-family="monospace" font-size="28" fill="#3dff9e">// ${esc(scope)}</text>
</svg>`;
}

// ─── run ─────────────────────────────────────────────────────

async function main() {
  const sections = ONLY ? SECTIONS.filter((d) => d.key === ONLY) : SECTIONS;
  const templates = ONLY ? TEMPLATES.filter((d) => d.key === ONLY) : TEMPLATES;
  if (!sections.length && !templates.length) {
    throw new Error(`Nothing called "${ONLY}". Keys: ${[...SECTIONS, ...TEMPLATES].map((d) => d.key).join(", ")}`);
  }

  console.log(`${DRY ? "[dry] " : ""}Studio compositions → ${COMPOSITIONS_CT} (${REGION}), publish to ${ENVIRONMENT}\n`);
  // publish_details reports environments by uid; also fails early on a bad name.
  const envUid = DRY ? "" : await getEnvironmentUid(ENVIRONMENT);

  for (const def of sections) await seedSection(def, envUid);
  for (const def of templates) await seedTemplate(def, envUid);
}

/** Encodes and round-trips a tree, and prints a one-line summary. */
function prepare(c: Composition, root: UINode, label: string, detail: string) {
  preflight(root, label);
  const ui = encodeUi(root);
  if (JSON.stringify(decodeUi(ui)) !== JSON.stringify(root)) throw new Error(`${label}: ui did not round-trip`);
  const nodeCount = JSON.stringify(root).split('"uid":').length - 1;
  const staticCount = Object.values(c.staticValue).reduce((n, rows) => n + rows.length, 0);
  console.log(`• ${label} — ${nodeCount} nodes, ${staticCount} static values, ${detail}`);
  return ui;
}

/** Creates or updates by composable_uid, publishes, and reads back with publish details. */
async function save(composableUid: string, entry: Record<string, unknown>, envUid: string) {
  const existing = await findByComposableUid(composableUid);
  const saved = existing
    ? await cma<{ entry: StoredEntry }>("PUT", `/content_types/${COMPOSITIONS_CT}/entries/${existing.uid}?locale=${LOCALE}`, { entry })
    : await cma<{ entry: StoredEntry }>("POST", `/content_types/${COMPOSITIONS_CT}/entries?locale=${LOCALE}`, { entry });
  await publishEntry(saved.entry.uid);
  // Read back: what the guides call the only trustworthy check.
  const { entry: back } = await cma<{ entry: StoredEntry }>(
    "GET",
    `/content_types/${COMPOSITIONS_CT}/entries/${saved.entry.uid}?locale=${LOCALE}&include_publish_details=true`
  );
  if (!(back.publish_details ?? []).some((p) => p.environment === envUid && p.locale === LOCALE)) {
    throw new Error(`${composableUid}: not published to ${ENVIRONMENT}`);
  }
  return { back, created: !existing };
}

async function seedSection(def: SectionDef, envUid: string) {
  const c = new Composition(def.key);
  const ui = prepare(c, def.build(c), `${def.title} (${def.composableUid})`, `scope ${JSON.stringify(def.linkedSchemas.map((l) => l.selected_field ?? "(whole entry)"))}`);
  if (DRY) return;

  // A CMA PUT replaces the entry, so carry the thumbnail across updates.
  const existing = await findByComposableUid(def.composableUid);
  let previewUid = existing?.ui_preview?.uid;
  if (!previewUid || FORCE_THUMBNAILS) previewUid = await uploadPreview(def);

  const { back, created } = await save(
    def.composableUid,
    {
      title: def.title,
      composable_uid: def.composableUid,
      connected_content_type: "",
      place_composition_as: "section",
      schema_version: "1.0.0",
      data_sources: "[]",
      linked_schemas: def.linkedSchemas,
      linked_sections: [],
      static_value: c.staticValue,
      ui,
      ui_preview: previewUid,
    },
    envUid
  );

  preflight(decodeUi(back.ui as string), `${def.title} (read back)`);
  const linkedBack = (back.linked_schemas as unknown[] | undefined)?.length ?? 0;
  if (linkedBack !== def.linkedSchemas.length) throw new Error(`${def.title}: linked_schemas came back with ${linkedBack} rows`);
  if (!back.ui_preview?.url) throw new Error(`${def.title}: ui_preview did not stick`);
  console.log(`    ${created ? "created" : "updated"} ${back.uid}, published, thumbnail ${back.ui_preview.url.split("/").pop()}`);
}

async function seedTemplate(def: TemplateDef, envUid: string) {
  // Sections are placed by entry uid, never composable_uid.
  const uids: Record<string, string> = {};
  for (const p of def.placements) {
    const found = DRY ? { uid: `<${p.section}>` } : await findByComposableUid(p.section);
    if (!found) throw new Error(`${def.title}: section ${p.section} doesn't exist yet — seed the sections first`);
    uids[p.section] = found.uid;
  }

  const c = new Composition(def.key);
  const root = c.root(
    def.placements.map((p, i) => c.sectionInstance(`s${i + 1}-${p.section.replace(/^flix_/, "")}`, p.title, uids[p.section], p.selectedField, p.exposed))
  );
  const ui = prepare(c, root, `${def.title} (${def.composableUid})`, `${def.placements.length} sections on ${def.contentType}`);
  if (DRY) return;

  const linkedSections = [...new Set(Object.values(uids))].map((uid) => ({ uid, _content_type_uid: COMPOSITIONS_CT }));
  const { back, created } = await save(
    def.composableUid,
    {
      title: def.title,
      composable_uid: def.composableUid,
      connected_content_type: def.contentType,
      place_composition_as: "page",
      schema_version: "1.0.0",
      url: def.url,
      url_metadata: {
        url_source: "content_type_url_pattern",
        url_queries: JSON.stringify({ include: [], only: {}, where: {} }),
      },
      data_sources: JSON.stringify([{ uid: "template", data: null, resolvedReferences: { template: def.resolvedReferences } }]),
      linked_schemas: [],
      linked_sections: linkedSections,
      static_value: c.staticValue,
      ui,
    },
    envUid
  );

  // Structural check: a template must be made of Sections, in the tree AND in
  // linked_sections (the editor reads the latter; SSR walks the former).
  const tree = decodeUi(back.ui as string);
  preflight(tree, `${def.title} (read back)`);
  const nodes = Object.values(tree.slots).flat().filter((n) => n.type === "section-composition").length;
  const linked = (back.linked_sections as unknown[] | undefined)?.length ?? 0;
  const urlMeta = back.url_metadata as { url_source?: string } | undefined;
  if (!nodes || !linked) throw new Error(`${def.title}: MONOLITH — ${nodes} section nodes, ${linked} linked_sections`);
  if (linked !== new Set(Object.values(uids)).size) throw new Error(`${def.title}: linked_sections has ${linked} rows`);
  if (urlMeta?.url_source !== "content_type_url_pattern") throw new Error(`${def.title}: url_metadata was dropped`);
  console.log(`    ${created ? "created" : "updated"} ${back.uid}, published — ${nodes} section nodes, ${linked} linked_sections, url ${back.url}`);
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
