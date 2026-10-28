// Shared prop shapes and coercions for the Studio adapters in ./components.
//
// Studio resolves bindings at render time, so any prop can arrive empty, and a few
// arrive in more than one shape depending on what the author picked in the Data
// Picker. Every adapter tolerates both rather than rendering "[object Object]".

import type { Cslptag, StudioAttributes } from "@contentstack/studio-react";

export type { Cslptag, StudioAttributes };

/** An image prop: a plain URL, or the Contentstack asset object it came from. */
export type ImageValue = string | { url?: string } | null | undefined;

export function imageUrl(value: ImageValue): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.url;
}

/**
 * A `choice` prop. Studio stores choice values as arrays (single-select included),
 * and older saves may hold the bare string, so read either.
 */
export function choice<T extends string>(value: T | T[] | null | undefined, fallback: T): T {
  const v = Array.isArray(value) ? value[0] : value;
  return v ?? fallback;
}

/**
 * A reference field: the Delivery API returns references as arrays even when the
 * field holds one entry. Returns the entries, skipping unresolved `{ uid }` stubs
 * (a stub means the composition didn't resolve that reference).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function entries(value: unknown): any[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter((e) => e && typeof e === "object" && Object.keys(e).some((k) => k !== "uid" && k !== "_content_type_uid"));
}

/**
 * A deep copy for the normalizers in lib/contentstack/normalize.ts, which write
 * rendered rich text and edit tags onto the object they're given. Props are never
 * mutated in place.
 */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
