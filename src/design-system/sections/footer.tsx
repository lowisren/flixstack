import Link from "next/link";
import { GitBranch, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { containers, gutterX } from "../tokens/layout";
import { Eyebrow } from "../primitives/eyebrow";
import { LogoMark } from "../primitives/logo-mark";
import { TextLink } from "../primitives/text-link";
import { ReduceEffectsControl } from "../patterns/reduce-effects-toggle";
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

const socialLinkClass = "text-text-secondary hover:text-accent transition-colors p-1";

/** Site footer: brand, CMS-driven link columns, effects preference and legal line. */
export function Footer({ footer, siteName = "Flixstack" }: FooterProps) {
  const FOOTER_COLUMNS = footer?.columns && footer.columns.length > 0 ? footer.columns : FALLBACK_FOOTER_COLUMNS;
  return (
    <footer
      className="grid-backdrop relative border-t border-border bg-surface mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      {/* relative + z-10: .grid-backdrop's pseudo-element is positioned, so
          without a positioned wrapper it would paint over this content. */}
      <div className={cn("relative z-10 py-12", containers.wide, gutterX)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 mb-4 w-fit"
              aria-label={`${siteName} home`}
            >
              <LogoMark />
              <span className="font-display text-lg uppercase">{siteName}</span>
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
                className={socialLinkClass}
                aria-label="ContentStack (opens in new tab)"
              >
                <GitBranch className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://twitter.com/contentstack"
                target="_blank"
                rel="noopener noreferrer"
                className={socialLinkClass}
                aria-label="ContentStack on Twitter (opens in new tab)"
              >
                <XIcon className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <Eyebrow
                as="h2"
                tone="primary"
                tracking="widest"
                weight="semibold"
                className="mb-3"
                {...col.$?.heading}
              >
                {col.heading}
              </Eyebrow>
              <ul className="space-y-2" role="list">
                {(col.links?.links ?? []).map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target={link.open_in_new_tab ? "_blank" : undefined}
                      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
                      className="text-sm text-text-secondary hover:text-accent transition-colors"
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
          <ReduceEffectsControl />
          <p className="font-mono text-xs text-text-secondary" {...footer?.$?.legal_text}>
            {footer?.legal_text || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
          <p className="font-mono text-xs text-text-secondary">
            <span className="text-accent" aria-hidden="true">
              &gt;{" "}
            </span>
            Built with{" "}
            <TextLink href="https://contentstack.com" newTab>
              Contentstack
            </TextLink>{" "}
            &middot; Next.js &middot; Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
