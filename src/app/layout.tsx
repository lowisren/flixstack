import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { SiteChrome } from "@/components/layout/site-chrome";
import { LivePreviewInit } from "@/components/contentstack/live-preview-init";
import { getFooter, getHeader, getSiteConfig } from "@/lib/contentstack/queries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Flixstack — Stream Everything",
    template: "%s | Flixstack",
  },
  description:
    "A ContentStack starter template. A fully functional movie & TV streaming platform built with Next.js, ContentStack, and Tailwind CSS.",
  keywords: ["streaming", "movies", "tv shows", "contentstack", "next.js"],
  openGraph: {
    title: "Flixstack",
    description: "A ContentStack starter template — movie & TV streaming platform.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, footer, siteConfig] = await Promise.all([getHeader(), getFooter(), getSiteConfig()]);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        <LivePreviewInit />
        <Providers>
          <SiteChrome initialHeader={header} initialFooter={footer} siteName={siteConfig.site_name}>
            {children}
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
