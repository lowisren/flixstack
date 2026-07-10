"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { initLytics } from "@/lib/lytics/client";

function LyticsInit() {
  useEffect(() => {
    initLytics();
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <LyticsInit />
      {children}
    </ThemeProvider>
  );
}
