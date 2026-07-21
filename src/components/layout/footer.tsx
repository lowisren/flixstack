import Link from "next/link";
import { Play, GitBranch, X as XIcon } from "lucide-react";
import type { Footer as FooterData, FooterColumn } from "@/lib/types";

const FALLBACK_FOOTER_COLUMNS: FooterColumn[] = [
  {
    heading: "Browse",
    links: {
      uid: "fallback-browse",
      title: "Browse",
      links: [
        { label: "All Titles", href: "/browse" },
        { label: "Movies", href: "/browse?type=movie" },
        { label: "TV Shows", href: "/browse?type=tv_series" },
        { label: "Genres", href: "/browse#genres" },
      ],
    },
  },
  {
    heading: "Account",
    links: {
      uid: "fallback-account",
      title: "Account",
      links: [
        { label: "My Profile", href: "/profile" },
        { label: "Watchlist", href: "/profile#watchlist" },
        { label: "Watch History", href: "/profile#history" },
      ],
    },
  },
  {
    heading: "Developer",
    links: {
      uid: "fallback-developer",
      title: "Developer",
      links: [
        { label: "Setup Guide", href: "/setup" },
        { label: "Content Models", href: "/setup#content-models" },
        { label: "Personalization", href: "/setup#personalization" },
        { label: "Automations", href: "/setup#automations" },
      ],
    },
  },
];

interface FooterProps {
  footer?: FooterData;
  siteName?: string;
}

export function Footer({ footer, siteName = "Flixstack" }: FooterProps) {
  const FOOTER_COLUMNS = footer?.columns && footer.columns.length > 0 ? footer.columns : FALLBACK_FOOTER_COLUMNS;
  return (
    <footer
      className="border-t border-border bg-surface mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 mb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) rounded-md w-fit"
              aria-label={`${siteName} home`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Play className="h-4 w-4 fill-accent-foreground text-accent-foreground" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold">{siteName}</span>
            </Link>
            <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
              A Contentstack starter template. Learn to build composable digital
              experiences with real-world patterns.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://contentstack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-(--color-text-primary) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) rounded-md p-1"
                aria-label="ContentStack (opens in new tab)"
              >
                <GitBranch className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://twitter.com/contentstack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-(--color-text-primary) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) rounded-md p-1"
                aria-label="ContentStack on Twitter (opens in new tab)"
              >
                <XIcon className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="text-sm font-semibold text-(--color-text-primary) mb-3" {...col.$?.heading}>
                {col.heading}
              </h2>
              <ul className="space-y-2" role="list">
                {(col.links?.links ?? []).map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target={link.open_in_new_tab ? "_blank" : undefined}
                      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className="text-sm text-text-secondary hover:text-(--color-text-primary) transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) rounded-sm"
                      {...link.$?.label}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-disabled" {...footer?.$?.legal_text}>
            {footer?.legal_text || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
          <p className="text-xs text-text-disabled">
            Built with{" "}
            <a
              href="https://contentstack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline focus-visible:outline-2 focus-visible:outline-(--color-focus-ring) rounded-sm"
            >
              Contentstack
            </a>{" "}
            &middot; Next.js &middot; Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
