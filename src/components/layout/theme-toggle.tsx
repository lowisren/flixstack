"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// "Am I hydrated yet?" without setState-in-an-effect: the server snapshot is
// false and the client snapshot is true, so the first client render matches SSR
// and the second reflects reality. Replaces the previous
// `useEffect(() => setMounted(true), [])`, which triggered a cascading render.
const neverChanges = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    neverChanges,
    () => true,
    () => false
  );

export function ThemeToggle() {
  // `resolvedTheme`, not `theme`. With `enableSystem`, `theme` holds the
  // *setting* — the literal string "system" — so `theme === "dark"` was false
  // for every visitor on System, even while the page rendered dark. That gave
  // the wrong icon and, worse, announced the wrong aria-label to screen
  // readers. `resolvedTheme` is the theme actually in effect.
  const { setTheme, resolvedTheme } = useTheme();
  const hydrated = useHydrated();

  const isDark = resolvedTheme === "dark";
  // Icon and label both describe the *action*, matching the aria-label, so
  // there is no ambiguity about whether the control shows state or intent.
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "[ DAY ]" : "[ NIGHT ]";
  const action = isDark ? "Switch to light mode" : "Switch to dark mode";

  // Before hydration the resolved theme is unknowable, so render the control at
  // its final size but inert and invisible — no layout shift, and no briefly
  // wrong label announced. The label span is a fixed width and nowrap so the
  // longer "[ NIGHT ]" cannot wrap and both states occupy the same space.
  if (!hydrated) {
    return (
      <Button variant="ghost" size="sm" aria-hidden="true" tabIndex={-1} className="invisible">
        <Moon className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline w-20 shrink-0 whitespace-nowrap text-left">[ NIGHT ]</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={action}
      title={action}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline w-20 shrink-0 whitespace-nowrap text-left">{label}</span>
    </Button>
  );
}
