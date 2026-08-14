#!/usr/bin/env node
/**
 * WCAG contrast guard for the Flixstack design tokens.
 *
 * Parses the real token values out of src/app/globals.css and checks every pair
 * that ships — so changing a token to a failing value fails this check instead
 * of shipping. This exists because docs/accessibility.md once asserted that the
 * light accent was 5.0:1 on white when it was actually 3.30:1, a genuine
 * WCAG 1.4.3 failure that sat in the codebase unnoticed.
 *
 *   node scripts/check-contrast.mjs          # table + exit code
 *   node scripts/check-contrast.mjs --json   # machine-readable
 *
 * Exits 1 if any pair fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

/** Pull `--token: #value;` declarations out of a top-level CSS block. */
function parseBlock(selector) {
  // Match the selector's first block. Tokens are flat hex values, so a
  // non-greedy match to the first closing brace is enough.
  const re = new RegExp(`(?:^|\\n)${selector}\\s*\\{([^}]*)\\}`, "m");
  const m = css.match(re);
  if (!m) throw new Error(`Could not find CSS block for "${selector}"`);
  const tokens = {};
  for (const decl of m[1].split(";")) {
    const t = decl.match(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/);
    if (t) tokens[t[1]] = t[2].toLowerCase();
  }
  return tokens;
}

const THEMES = { light: parseBlock(":root"), dark: parseBlock("\\.dark") };

const srgb = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = ["--color-bg-base", "--color-bg-surface", "--color-bg-elevated"];

/** Text that must clear 4.5:1 (WCAG 1.4.3) on every surface it can sit on. */
const TEXT_ON_ALL_SURFACES = [
  "--color-text-primary",
  "--color-text-secondary",
  "--color-accent",
  "--color-accent-hover",
  "--color-info",
  "--color-signal",
  "--color-premium",
  "--color-error",
];

/** Non-text UI that must clear 3:1 (WCAG 1.4.11). */
const UI_ON_ALL_SURFACES = ["--color-border-control", "--color-focus-ring"];

/** Foreground/fill pairs. */
const FILLS = [
  ["--color-accent-foreground", "--color-accent", 4.5],
  ["--color-accent-foreground", "--color-accent-hover", 4.5],
];

/** Tinted chip backgrounds and the hue that sits on them. */
const SUBTLE_PAIRS = [
  ["--color-accent", "--color-accent-subtle"],
  ["--color-info", "--color-info-subtle"],
  ["--color-signal", "--color-signal-subtle"],
  ["--color-premium", "--color-premium-subtle"],
  ["--color-error", "--color-error-subtle"],
];

const results = [];
const add = (theme, fgTok, bgTok, min, tokens) => {
  const fg = tokens[fgTok];
  const bg = tokens[bgTok];
  if (!fg || !bg) {
    results.push({ theme, fgTok, bgTok, min, missing: true, pass: false });
    return;
  }
  const ratio = contrast(fg, bg);
  results.push({
    theme, fgTok, bgTok, fg, bg, min,
    ratio: Math.round(ratio * 100) / 100,
    pass: ratio >= min,
  });
};

for (const [theme, tokens] of Object.entries(THEMES)) {
  for (const fg of TEXT_ON_ALL_SURFACES)
    for (const bg of SURFACES) add(theme, fg, bg, 4.5, tokens);
  for (const fg of UI_ON_ALL_SURFACES)
    for (const bg of SURFACES) add(theme, fg, bg, 3.0, tokens);
  // Disabled text is the one token held only to 3:1, so it is restricted to
  // non-essential text. Checked on the worst surface it appears on.
  add(theme, "--color-text-disabled", "--color-bg-elevated", 3.0, tokens);
  for (const [fg, bg, min] of FILLS) add(theme, fg, bg, min, tokens);
  for (const [fg, bg] of SUBTLE_PAIRS) add(theme, fg, bg, 4.5, tokens);
}

const failed = results.filter((r) => !r.pass);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
} else {
  for (const theme of Object.keys(THEMES)) {
    console.log(`\n=== ${theme.toUpperCase()} ===`);
    for (const r of results.filter((x) => x.theme === theme)) {
      const name = `${r.fgTok.replace("--color-", "")} on ${r.bgTok.replace("--color-", "")}`;
      console.log(
        `${r.pass ? "PASS" : "FAIL"}  ${String(r.ratio ?? "—").padStart(6)}:1  (min ${r.min})  ${name}` +
          (r.missing ? "  [token missing]" : "")
      );
    }
  }
  console.log(
    `\n${results.length - failed.length}/${results.length} pass` +
      (failed.length ? ` — ${failed.length} FAILING` : "")
  );
}

process.exit(failed.length ? 1 : 0);
