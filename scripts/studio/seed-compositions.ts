#!/usr/bin/env tsx
// ============================================================
// Flixstack — Contentstack Studio compositions seed
//
// Writes the Studio sections (and, from phase 6, the template) for the
// "Collection page" layout described in docs/studio-plan.md §7, as entries of the
// Studio project's compositions content type, then publishes them.
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
//     --only=<key>        one composition, e.g. --only=promo
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
  const defs = ONLY ? SECTIONS.filter((s) => s.key === ONLY) : SECTIONS;
  if (!defs.length) throw new Error(`No section with key "${ONLY}". Keys: ${SECTIONS.map((s) => s.key).join(", ")}`);

  console.log(`${DRY ? "[dry] " : ""}Studio sections → ${COMPOSITIONS_CT} (${REGION}), publish to ${ENVIRONMENT}\n`);
  // publish_details reports environments by uid; also fails early on a bad name.
  const envUid = DRY ? "" : await getEnvironmentUid(ENVIRONMENT);

  for (const def of defs) {
    const c = new Composition(def.key);
    const root = def.build(c);
    preflight(root, def.title);
    const ui = encodeUi(root);
    // Round-trip the encoding before trusting it with a write.
    if (JSON.stringify(decodeUi(ui)) !== JSON.stringify(root)) throw new Error(`${def.title}: ui did not round-trip`);

    const nodeCount = JSON.stringify(root).split('"uid":').length - 1;
    const staticCount = Object.values(c.staticValue).reduce((n, rows) => n + rows.length, 0);
    console.log(`• ${def.title} (${def.composableUid}) — ${nodeCount} nodes, ${staticCount} static values, scope ${JSON.stringify(def.linkedSchemas.map((l) => l.selected_field ?? "(whole entry)"))}`);
    if (DRY) continue;

    const existing = await findByComposableUid(def.composableUid);
    // A CMA PUT replaces the entry, so carry the thumbnail across updates.
    let previewUid = existing?.ui_preview?.uid;
    if (!previewUid || FORCE_THUMBNAILS) previewUid = await uploadPreview(def);

    const entry = {
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
    };

    const saved = existing
      ? await cma<{ entry: StoredEntry }>("PUT", `/content_types/${COMPOSITIONS_CT}/entries/${existing.uid}?locale=${LOCALE}`, { entry })
      : await cma<{ entry: StoredEntry }>("POST", `/content_types/${COMPOSITIONS_CT}/entries?locale=${LOCALE}`, { entry });
    await publishEntry(saved.entry.uid);

    // Read back: what the guides call the only trustworthy check.
    const { entry: back } = await cma<{ entry: StoredEntry }>(
      "GET",
      `/content_types/${COMPOSITIONS_CT}/entries/${saved.entry.uid}?locale=${LOCALE}&include_publish_details=true`
    );
    const backUi = decodeUi(back.ui as string);
    preflight(backUi, `${def.title} (read back)`);
    const published = (back.publish_details ?? []).some((p) => p.environment === envUid && p.locale === LOCALE);
    const linkedBack = (back.linked_schemas as unknown[] | undefined)?.length ?? 0;
    if (linkedBack !== def.linkedSchemas.length) throw new Error(`${def.title}: linked_schemas came back with ${linkedBack} rows`);
    if (!back.ui_preview?.url) throw new Error(`${def.title}: ui_preview did not stick`);
    if (!published) throw new Error(`${def.title}: not published`);
    console.log(`    ${existing ? "updated" : "created"} ${back.uid}, published, thumbnail ${back.ui_preview.url.split("/").pop()}`);
  }
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
