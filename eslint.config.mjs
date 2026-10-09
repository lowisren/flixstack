import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Design-system guardrail: colours come from tokens (src/design-system/tokens),
// never from raw Tailwind palette classes, white/black, or hex literals. Raw
// values bypass the theme, the contrast gate (scripts/check-contrast.mjs) and
// the reduce-effects / forced-colours handling. Matched in string literals and
// template strings, so it covers className, cn() arguments and variant maps.
const BANNED_CLASSES = [
  [
    "(^|\\s|:)(bg|text|border|fill|stroke|ring|from|via|to|outline|divide|placeholder|caret|shadow|decoration)-(white|black)(\\/|\\s|$)",
    "Use the on-media tokens (text-on-media, border-on-media/25, bg-media-shade/70, bg-media-ground) instead of white/black.",
  ],
  [
    "-(red|green|blue|gray|slate|zinc|neutral|stone|yellow|amber|emerald|orange|lime|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}(\\/|\\s|$)",
    "Use a design token instead of a raw Tailwind palette colour.",
  ],
  ["\\[#[0-9a-fA-F]{3,8}\\]", "Use a design token instead of an arbitrary hex colour."],
  ["-\\[var\\(--", "Use the Tailwind v4 shorthand, e.g. bg-(--token), instead of bg-[var(--token)]."],
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...BANNED_CLASSES.flatMap(([re, message]) => [
          { selector: `Literal[value=/${re}/]`, message },
          { selector: `TemplateElement[value.raw=/${re}/]`, message },
        ]),
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
