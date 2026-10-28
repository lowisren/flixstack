#!/usr/bin/env node
/**
 * Visual-parity harness for the design-system refactor (docs/design-system-plan.md).
 *
 * Screenshots every route in scripts/lib/routes.mjs across
 *   theme {dark, light} × effects {on, reduced} × width {1440, 390}
 * and diffs them pixel-for-pixel against a saved baseline.
 *
 *   npm run build && npx next start -p 3100     # in another terminal
 *   npm run snapshot -- --baseline              # -> reports/snapshots/baseline/
 *   npm run snapshot -- --compare               # -> reports/snapshots/current/ + diff/
 *   npm run snapshot -- --compare --only=/watch # one route (substring match)
 *
 * Capture baseline and comparison back to back against the same Contentstack
 * environment: a CMS edit in between is indistinguishable from a regression.
 *
 * Determinism:
 *   - prefers-reduced-motion is emulated, which stops every CSS animation
 *     (globals.css defines a static state for each one).
 *   - The hero carousel rotates on a 6s setInterval that reduced motion does
 *     not stop, so intervals of 5s or more are suppressed in the page.
 *   - The viewport is grown to the full page height before capture, so
 *     lazy-loaded images below the fold are in view and load.
 *   - Each run starts from an empty Chrome profile with the HTTP cache off,
 *     so srcset selection does not depend on what an earlier run cached.
 *
 * Exits 1 if any screenshot differs (--compare only).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { arg, launchChrome, sleep } from "./lib/chrome.mjs";
import { ROUTES } from "./lib/routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = arg("url", "http://localhost:3100").replace(/\/$/, "");
const PORT = Number(arg("cdp-port", "9223"));
const ONLY = arg("only", null);
const mode = process.argv.includes("--baseline") ? "baseline" : "current";
const compare = process.argv.includes("--compare");

const OUT = join(root, "reports/snapshots");
const dir = join(OUT, mode);
const diffDir = join(OUT, "diff");

const THEMES = ["dark", "light"];
const EFFECTS = ["fx", "reduced"];
const WIDTHS = [1440, 390];
const MAX_HEIGHT = 12000;

const routes = ONLY ? ROUTES.filter((r) => r.includes(ONLY)) : ROUTES;
const fileName = (route, theme, fx, width) =>
  `${route === "/" ? "home" : route.slice(1).replace(/[^a-z0-9]+/gi, "_")}--${theme}--${fx}--${width}.png`;

// --- capture ----------------------------------------------------------------
if (!ONLY) rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

// A fresh profile and no HTTP cache on every run. With a warm cache Chrome may
// satisfy a srcset from a larger candidate it already holds instead of the one
// it would pick cold, so the same build renders artwork at different sharpness
// from one run to the next.
const PROFILE = "/tmp/flixstack-snapshot-profile";
rmSync(PROFILE, { recursive: true, force: true });
const { send, evaluate, close } = await launchChrome({ port: PORT, profileDir: PROFILE });
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setEmulatedMedia", {
  features: [
    { name: "prefers-reduced-motion", value: "reduce" },
    { name: "prefers-color-scheme", value: "light" },
  ],
});

let captured = 0;
const capturedFiles = [];
for (const theme of THEMES) {
  for (const fx of EFFECTS) {
    // Runs before any page script, so next-themes and the reduce-effects
    // pre-hydration script both read the seeded preference on first paint.
    const { identifier } = await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        try {
          localStorage.setItem('theme', ${JSON.stringify(theme)});
          localStorage.setItem('flixstack-reduce-fx', ${JSON.stringify(fx === "reduced" ? "1" : "0")});
        } catch (e) {}
        const __si = window.setInterval;
        window.setInterval = (fn, ms, ...a) => (ms >= 5000 ? 0 : __si(fn, ms, ...a));
      `,
    });

    for (const width of WIDTHS) {
      for (const route of routes) {
        await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
        await send("Page.navigate", { url: BASE + route });
        await sleep(2500);
        const height = await evaluate(`Math.ceil(document.documentElement.scrollHeight)`);
        await send("Emulation.setDeviceMetricsOverride", {
          width, height: Math.min(height, MAX_HEIGHT), deviceScaleFactor: 1, mobile: width < 768,
        });
        await evaluate(
          `Promise.race([
             Promise.all([
               document.fonts.ready,
               ...Array.from(document.images).map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })),
             ]),
             new Promise(r => setTimeout(r, 8000)),
           ])`,
          true
        );
        await sleep(400);
        const { data } = await send("Page.captureScreenshot", { format: "png" });
        const name = fileName(route, theme, fx, width);
        writeFileSync(join(dir, name), Buffer.from(data, "base64"));
        capturedFiles.push(name);
        captured++;
        process.stdout.write(`\r${mode}: ${captured} captured`);
      }
    }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  }
}
close();
console.log(`\n${mode}: ${captured} screenshots -> ${dir}`);

// --- compare ----------------------------------------------------------------
if (!compare) process.exit(0);

const baseDir = join(OUT, "baseline");
if (!existsSync(baseDir)) {
  console.error("No baseline. Run `npm run snapshot -- --baseline` first.");
  process.exit(1);
}
rmSync(diffDir, { recursive: true, force: true });
mkdirSync(diffDir, { recursive: true });

let failures = 0;
// Only this run's captures: with --only, older files for other routes remain in the folder.
for (const file of capturedFiles.sort()) {
  const basePath = join(baseDir, file);
  if (!existsSync(basePath)) {
    console.log(`  NEW      ${file} (no baseline)`);
    failures++;
    continue;
  }
  const a = PNG.sync.read(readFileSync(basePath));
  const b = PNG.sync.read(readFileSync(join(dir, file)));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`  SIZE     ${file}  ${a.width}x${a.height} -> ${b.width}x${b.height}`);
    failures++;
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  if (n > 0) {
    writeFileSync(join(diffDir, file), PNG.sync.write(diff));
    console.log(`  PIXELS   ${file}  ${n} px differ`);
    failures++;
  }
}

console.log(
  failures
    ? `\n${failures} screenshot${failures === 1 ? "" : "s"} differ — see ${diffDir}`
    : `\nAll ${captured} screenshots match the baseline.`
);
process.exit(failures ? 1 : 0);
