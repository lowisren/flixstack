"use client";

import { useSyncExternalStore } from "react";

/**
 * Colour tokens with their live contrast ratios, read from the CSS variables
 * in effect — so the table follows the theme and reduce-effects toggles.
 * Same formula as scripts/check-contrast.mjs, which is the gate; this is the
 * human-readable view of it.
 */

const SURFACES = ["--color-bg-base", "--color-bg-surface", "--color-bg-elevated"] as const;

const GROUPS: { title: string; min: number; tokens: string[] }[] = [
  { title: "Text (needs 4.5:1)", min: 4.5, tokens: ["--color-text-primary", "--color-text-secondary"] },
  {
    title: "Signal hues (needs 4.5:1 as text)",
    min: 4.5,
    tokens: ["--color-accent", "--color-accent-hover", "--color-info", "--color-signal", "--color-premium", "--color-error"],
  },
  { title: "Controls (needs 3:1, WCAG 1.4.11)", min: 3, tokens: ["--color-border-control", "--color-focus-ring"] },
  { title: "Non-essential (3:1)", min: 3, tokens: ["--color-text-disabled"] },
];

// Re-render whenever <html>'s class changes (theme or reduce-effects toggle).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.className;
const getServerSnapshot = () => "";

function luminance(hex: string) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

// false on the server and during hydration, true afterwards — so the first
// client render matches the server HTML and computed styles are read after.
const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);

export function TokenSwatches() {
  const hydrated = useHydrated();
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const read = (name: string) =>
    hydrated ? getComputedStyle(document.documentElement).getPropertyValue(name).trim().toLowerCase() : "";

  const surfaces = SURFACES.map((s) => read(s));

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="font-mono text-xs uppercase tracking-wider text-text-secondary mb-2">{group.title}</p>
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-left text-text-secondary">
                <th scope="col" className="py-1 pr-4 font-normal">Token</th>
                <th scope="col" className="py-1 pr-4 font-normal">Value</th>
                {SURFACES.map((s) => (
                  <th key={s} scope="col" className="py-1 pr-4 font-normal">
                    on {s.replace("--color-bg-", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.tokens.map((token) => {
                const value = read(token);
                return (
                  <tr key={token} className="border-t border-border">
                    <th scope="row" className="py-1.5 pr-4 font-normal text-left text-text-primary">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 border border-border-control"
                          style={{ background: `var(${token})` }}
                          aria-hidden="true"
                        />
                        {token.replace("--color-", "")}
                      </span>
                    </th>
                    <td className="py-1.5 pr-4 text-text-secondary">{value || "—"}</td>
                    {surfaces.map((bg, i) => {
                      if (!/^#[0-9a-f]{6}$/.test(value) || !/^#[0-9a-f]{6}$/.test(bg)) {
                        return <td key={i} className="py-1.5 pr-4 text-text-secondary">—</td>;
                      }
                      const ratio = contrast(value, bg);
                      const pass = ratio >= group.min;
                      return (
                        <td key={i} className="py-1.5 pr-4 tabular-nums text-text-primary">
                          {ratio.toFixed(2)}:1{" "}
                          {/* Pass/fail is spelled out, not shown by colour alone. */}
                          <span className={pass ? "text-accent" : "text-(--color-error)"}>{pass ? "pass" : "FAIL"}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
