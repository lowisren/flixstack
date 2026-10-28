/**
 * Minimal headless-Chrome driver over the DevTools Protocol, shared by
 * scripts/a11y.mjs and scripts/snapshot.mjs. No Selenium or Playwright
 * dependency. Set CHROME_PATH if your browser is somewhere unusual.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Reads `--name=value` from argv. */
export const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

/**
 * Launches headless Chrome and attaches to a fresh tab.
 * Returns `send` (CDP command on the tab), `evaluate` (returns by value), and
 * `close`. Exits the process if Chrome cannot be found or does not come up.
 */
export async function launchChrome({ port = 9222, profileDir = "/tmp/flixstack-chrome-profile" } = {}) {
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chromePath) {
    console.error(
      "Could not find Chrome. Set CHROME_PATH, e.g.\n" +
        "  CHROME_PATH='/path/to/chrome' npm run a11y"
    );
    process.exit(1);
  }

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let wsUrl;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
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

  const close = () => {
    ws.close();
    chrome.kill();
  };

  return { send, evaluate, close };
}
