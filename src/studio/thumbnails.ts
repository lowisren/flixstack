// Palette thumbnails for the registered components.
//
// Inline SVG data URIs: the palette renders inside Studio's iframe, where an
// external image URL is blocked, and SVG thumbnails can't read CSS variables or
// currentColor. So the colours are the dark theme's token values, copied from
// design-system/tokens/tokens.css (.dark), and the drawings preview each
// component's shape rather than its pixels.

const C = {
  bg: "#05070a", // --color-bg-base
  surface: "#0b0f14", // --color-bg-surface
  elevated: "#121822", // --color-bg-elevated
  border: "#1e2a38", // --color-border
  text: "#e6f1f5", // --color-text-primary
  muted: "#94a9b8", // --color-text-secondary
  accent: "#3dff9e", // --color-accent
  signal: "#ff4fd8", // --color-signal
};

function thumb(body: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="${C.bg}"/>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const bar = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const box = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.surface}" stroke="${C.border}" stroke-width="1.5"/>`;
const dashed = (x: number, y: number, w: number, h: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="4 3"/>`;

export const thumbnails = {
  heading: thumb(bar(14, 30, 92, 14, C.text) + bar(14, 50, 56, 4, C.border)),
  eyebrow: thumb(bar(14, 34, 10, 6, C.accent) + bar(28, 34, 56, 6, C.accent) + bar(14, 46, 80, 4, C.border)),
  text: thumb(bar(14, 24, 92, 5, C.muted) + bar(14, 35, 88, 5, C.muted) + bar(14, 46, 92, 5, C.muted) + bar(14, 57, 60, 5, C.muted)),
  richText: thumb(
    bar(14, 18, 50, 7, C.text) + bar(14, 32, 92, 4, C.muted) + bar(14, 41, 86, 4, C.muted) + bar(14, 54, 6, 4, C.accent) + bar(24, 54, 70, 4, C.muted) + bar(14, 63, 6, 4, C.accent) + bar(24, 63, 56, 4, C.muted)
  ),
  image: thumb(
    box(14, 12, 92, 56) +
      `<circle cx="38" cy="32" r="7" fill="${C.muted}"/><path d="M14 68 L48 40 L70 56 L84 46 L106 68 Z" fill="${C.elevated}" stroke="${C.border}"/>`
  ),
  badge: thumb(`<rect x="34" y="31" width="52" height="18" rx="3" fill="${C.elevated}" stroke="${C.accent}" stroke-width="1.5"/>` + bar(44, 38, 32, 4, C.accent)),
  buttonLink: thumb(`<path d="M28 28 H86 L92 34 V52 H34 L28 46 Z" fill="${C.accent}"/>` + bar(42, 38, 36, 4, C.bg)),
  ratingBadge: thumb(`<rect x="38" y="30" width="44" height="20" rx="3" fill="${C.elevated}" stroke="${C.muted}" stroke-width="1.5"/>` + bar(48, 38, 24, 4, C.text)),
  score: thumb(`<path d="M40 30 l4 9 10 1 -8 6 3 10 -9 -6 -9 6 3 -10 -8 -6 10 -1 Z" fill="${C.accent}"/>` + bar(62, 36, 24, 8, C.accent)),

  stack: thumb(dashed(30, 10, 60, 18) + dashed(30, 31, 60, 18) + dashed(30, 52, 60, 18)),
  row: thumb(dashed(10, 25, 30, 30) + dashed(45, 25, 30, 30) + dashed(80, 25, 30, 30)),
  grid: thumb(
    dashed(12, 12, 30, 24) + dashed(45, 12, 30, 24) + dashed(78, 12, 30, 24) + dashed(12, 44, 30, 24) + dashed(45, 44, 30, 24) + dashed(78, 44, 30, 24)
  ),
  sectionShell: thumb(bar(0, 10, 120, 60, C.surface) + dashed(18, 20, 84, 40)),
  panel: thumb(`<path d="M22 12 H98 V58 L88 68 H22 Z" fill="${C.surface}" stroke="${C.border}" stroke-width="1.5"/>` + dashed(30, 20, 60, 38)),

  heroCarousel: thumb(
    bar(0, 0, 120, 80, C.elevated) + bar(12, 36, 60, 9, C.text) + bar(12, 49, 44, 4, C.muted) + bar(12, 58, 24, 8, C.accent) +
      `<circle cx="52" cy="73" r="2" fill="${C.accent}"/><circle cx="60" cy="73" r="2" fill="${C.muted}"/><circle cx="68" cy="73" r="2" fill="${C.muted}"/>`
  ),
  titleRail: thumb(bar(8, 14, 40, 6, C.text) + box(8, 28, 32, 40) + box(44, 28, 32, 40) + box(80, 28, 32, 40) + bar(112, 28, 8, 40, C.elevated)),
  titleGrid: thumb(box(10, 8, 22, 30) + box(36, 8, 22, 30) + box(62, 8, 22, 30) + box(88, 8, 22, 30) + box(10, 42, 22, 30) + box(36, 42, 22, 30) + box(62, 42, 22, 30) + box(88, 42, 22, 30)),
  titleCard: thumb(box(40, 8, 40, 52) + bar(40, 64, 30, 4, C.text) + bar(40, 71, 18, 3, C.accent)),
};
