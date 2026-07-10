import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function formatYear(dateString: string): string {
  return new Date(dateString).getFullYear().toString();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/** Strips HTML tags from Rich Text fields (rendered to HTML by @contentstack/utils'
 * jsonToHTML) so they're safe to use as plain-text excerpts, e.g. <meta description>. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function getRatingColor(rating: string): string {
  const r = rating.toUpperCase();
  if (r === "G") return "text-green-600 dark:text-green-400";
  if (r === "PG") return "text-blue-600 dark:text-blue-400";
  if (r === "PG-13") return "text-yellow-600 dark:text-yellow-400";
  if (r === "R" || r === "TV-MA") return "text-red-600 dark:text-red-400";
  return "text-[var(--color-text-secondary)]";
}
