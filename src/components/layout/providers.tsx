"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Dark is the default: the cyber treatment is dark-native, so a first-time
    // visitor should land in the intended design. `enableSystem` stays on, so
    // System remains selectable and anyone who has explicitly chosen light or
    // system keeps it.
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
