"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Storage key for the "reduce effects" preference. Kept in sync with the
 * pre-hydration script in `app/layout.tsx`, which applies the class before
 * first paint so there is no flash of un-reduced effects.
 */
export const REDUCE_FX_KEY = "flixstack-reduce-fx";
const CLASS = "reduce-fx";

// The preference lives on <html> as a class, not in React state: the
// pre-hydration script needs to set it before React exists, and CSS reads it
// from there. useSyncExternalStore subscribes to our own change event so every
// mounted toggle (footer + profile) stays in sync without lifted state.
const EVENT = "flixstack:reduce-fx";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = () => document.documentElement.classList.contains(CLASS);
// Server render assumes effects are ON, matching the un-suppressed default.
const getServerSnapshot = () => false;

export function useReduceEffects() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Safety net for client-rendered shells. The pre-hydration script in
  // app/layout.tsx keeps normal server-rendered loads flash-free, but it does
  // not run when React renders the shell on the client — inline scripts inside
  // React components are never executed then. The 404 route hits exactly that
  // path (it 307-redirects, then renders client-side), so without this the
  // preference silently failed there while working everywhere else.
  //
  // This reconciles the DOM from storage on mount. It is a no-op whenever the
  // script already ran, so it costs a possible single frame only on the paths
  // where the script cannot run at all.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(REDUCE_FX_KEY);
    } catch {
      return;
    }
    const should = stored === "1";
    if (should !== document.documentElement.classList.contains(CLASS)) {
      document.documentElement.classList.toggle(CLASS, should);
      window.dispatchEvent(new Event(EVENT));
    }
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    document.documentElement.classList.toggle(CLASS, next);
    try {
      localStorage.setItem(REDUCE_FX_KEY, next ? "1" : "0");
    } catch {
      // Private browsing / storage disabled — the class still applies for this
      // session, it just won't persist.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [enabled, setEnabled] as const;
}

/**
 * A `role="switch"` control for the reduce-effects preference.
 *
 * This is a *user preference*, never a substitute for `prefers-reduced-motion`
 * — that media query is honoured independently in globals.css and always wins,
 * so a visitor with the OS setting on gets reduced motion whatever this says.
 */
export function ReduceEffectsToggle({ className }: { className?: string }) {
  const [enabled, setEnabled] = useReduceEffects();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Reduce visual effects"
      onClick={() => setEnabled(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors ${
        enabled ? "border-accent bg-accent" : "border-border-control bg-elevated"
      } ${className ?? ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-pod transition-transform ${
          enabled
            ? "translate-x-6 bg-(--color-accent-foreground)"
            : "translate-x-1 bg-(--color-text-secondary)"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

/** Compact labelled variant for the footer. */
export function ReduceEffectsControl() {
  const [enabled] = useReduceEffects();
  return (
    <div className="flex items-center gap-3">
      <ReduceEffectsToggle />
      <span className="font-mono text-xs uppercase tracking-wider text-text-secondary">
        Reduce effects
        <span className="sr-only">{enabled ? " (on)" : " (off)"}</span>
      </span>
    </div>
  );
}
