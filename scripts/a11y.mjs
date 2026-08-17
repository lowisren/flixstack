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
 * Drives headless Chrome over the DevTools Protocol — no Selenium or Playwright
 * dependency. Set CHROME_PATH if your browser is somewhere unusual.
 *
 * Exits 1 if any violation is found, so it can gate CI.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg("url", "http://localhost:3000").replace(/\/$/, "");
const PORT = Number(arg("cdp-port", "9222"));

// Routes worth auditing. Dynamic routes use a real slug from the seeded data.
const ROUTES = [
  "/", "/browse", "/search", "/movie", "/tv-show",
  "/genre/sci-fi", "/watch/oppenheimer", "/watch/the-bear",
  "/profile", "/setup", "/no-such-page-this-404s",
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!chromePath) {
  console.error(
    "Could not find Chrome. Set CHROME_PATH, e.g.\n" +
      "  CHROME_PATH='/path/to/chrome' npm run a11y"
  );
  process.exit(1);
}

const axeSource = readFileSync(join(root, "node_modules/axe-core/axe.min.js"), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- minimal CDP client -----------------------------------------------------
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=/tmp/flixstack-a11y-profile",
    "about:blank",
  ],
  { stdio: "ignore" }
);

let wsUrl;
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    const j = await res.json();
    if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; }
  } catch { /* not up yet */ }
  await sleep(250);
}
if (!wsUrl) { chrome.kill(); console.error("Chrome did not expose a CDP endpoint."); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) reject(new Error(JSON.stringify(m.error)));
    else resolve(m.result);
  }
};
const rawSend = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await rawSend("Target.createTarget", { url: "about:blank" });
const { sessionId } = await rawSend("Target.attachToTarget", { targetId, flatten: true });
const send = (m, p) => rawSend(m, p, sessionId);
const evaluate = async (expression, awaitPromise = false) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");

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

  for (const route of ROUTES) {
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

ws.close();
chrome.kill();
process.exit(totalViolations ? 1 : 0);
