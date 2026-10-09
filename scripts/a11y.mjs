#!/usr/bin/env node
/**
 * axe-core accessibility audit across every route, in both themes.
 *
 * docs/accessibility.md used to document an `npm run a11y` that did not exist.
 * This is it.
 *
 *   npm run dev                 # in another terminal
 *   npm run a11y                # -> reports/a11y-report.json
 *   npm run a11y -- --url=http://localhost:3001
 *
 * Chrome is driven by scripts/lib/chrome.mjs; the route list is shared with
 * scripts/snapshot.mjs via scripts/lib/routes.mjs.
 *
 * Exits 1 if any violation is found, so it can gate CI.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { arg, launchChrome, sleep } from "./lib/chrome.mjs";
import { ROUTES } from "./lib/routes.mjs";

// The design-system catalog is audited too (it is not screenshotted: it has no
// pre-refactor baseline). It renders only in dev or with NEXT_PUBLIC_DESIGN_SYSTEM=true.
const CATALOG = "/design-system";
const AUDIT_ROUTES = [...ROUTES, CATALOG];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = arg("url", "http://localhost:3000").replace(/\/$/, "");
const PORT = Number(arg("cdp-port", "9222"));

const axeSource = readFileSync(join(root, "node_modules/axe-core/axe.min.js"), "utf8");
const { send, evaluate, close } = await launchChrome({ port: PORT, profileDir: "/tmp/flixstack-a11y-profile" });

// --- audit ------------------------------------------------------------------
const report = { base: BASE, generatedAt: null, axeVersion: null, runs: [] };
let totalViolations = 0;

for (const theme of ["dark", "light"]) {
  // Theme is a stored preference read by next-themes, so seed it then reload.
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(1500);
  await evaluate(
    theme === "light"
      ? `localStorage.setItem('theme','light')`
      : `localStorage.removeItem('theme')`
  );

  for (const route of AUDIT_ROUTES) {
    await send("Page.navigate", { url: BASE + route });
    await sleep(2600);
    await evaluate(axeSource);
    const result = await evaluate(
      // Exclude the Next.js dev overlay and the Contentstack Live Preview
      // widget: third-party UI that is not part of the shipped app.
      `axe.run(
         { exclude: [['nextjs-portal'], ['[data-nextjs-toast]'], ['#cs-live-preview-panel']] },
         { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }
       ).then(r => JSON.stringify({
         url: r.url,
         violations: r.violations.map(v => ({
           id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
           nodes: v.nodes.slice(0, 5).map(n => ({ target: n.target, summary: n.failureSummary })),
           count: v.nodes.length,
         })),
       }))`,
      true
    );
    const parsed = JSON.parse(result);

    // Live Preview edit tags on the catalog: every example that renders CMS
    // fields must carry at least one data-cslp. Only meaningful when Live
    // Preview is on (no tags anywhere means it is off, so the check is skipped).
    if (route === CATALOG) {
      const missing = await evaluate(`(() => {
        if (!document.querySelector('[data-cslp]')) return null;
        return [...document.querySelectorAll('[data-specimen-cms]')]
          .filter((el) => !el.querySelector('[data-cslp]'))
          .map((el) => el.dataset.specimen);
      })()`);
      if (missing === null) {
        console.log(`${theme.padEnd(5)} ${route.padEnd(26)} edit-tag check skipped (Live Preview off)`);
      } else if (missing.length) {
        parsed.violations.push({
          id: "cslp-missing", impact: "serious",
          help: `Specimens render CMS fields without Live Preview edit tags: ${missing.join(", ")}`,
          helpUrl: "docs/design-system-plan.md", nodes: [], count: missing.length,
        });
      }
    }

    const n = parsed.violations.reduce((s, v) => s + v.count, 0);
    totalViolations += n;

    report.runs.push({ theme, route, violations: parsed.violations });
    const label = `${theme.padEnd(5)} ${route.padEnd(26)}`;
    if (n === 0) console.log(`${label} clean`);
    else {
      console.log(`${label} ${n} violation${n === 1 ? "" : "s"}`);
      for (const v of parsed.violations) console.log(`    [${v.impact}] ${v.id}: ${v.help} (${v.count})`);
    }
  }
}

report.axeVersion = await evaluate(`axe.version`);
report.generatedAt = new Date().toISOString();

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(join(root, "reports/a11y-report.json"), JSON.stringify(report, null, 2));

console.log(
  `\naxe-core ${report.axeVersion} · ${report.runs.length} runs · ` +
    `${totalViolations} total violation${totalViolations === 1 ? "" : "s"}`
);
console.log("report: reports/a11y-report.json");

close();
process.exit(totalViolations ? 1 : 0);
