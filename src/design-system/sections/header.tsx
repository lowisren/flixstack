"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { containers, gutterX } from "../tokens/layout";
import { Button } from "../primitives/button";
import { IconButton } from "../primitives/icon-button";
import { LogoMark } from "../primitives/logo-mark";
import { ThemeToggle } from "../patterns/theme-toggle";
import { cn } from "@/lib/utils";
import { Nav } from "./nav";
import type { Header as HeaderData, NavLinkItem } from "@/lib/types";

const FALLBACK_NAV_LINKS: NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "Movies", href: "/browse?type=movie" },
  { label: "TV Shows", href: "/browse?type=tv_series" },
];

interface HeaderProps {
  header?: HeaderData;
  siteName?: string;
}

/** Sticky site header: logo, primary navigation, search, theme and profile. */
export function Header({ header, siteName = "Flixstack" }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = header?.main_navigation?.links;
  const NAV_LINKS = navLinks && navLinks.length > 0 ? navLinks : FALLBACK_NAV_LINKS;
  const showSearch = header?.show_search !== false;
  const showProfile = header?.show_profile !== false;

  return (
    <header
      className="chrome-underglow sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md"
      role="banner"
    >
      <div className={cn(containers.wide, gutterX)}>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
            aria-label={`${siteName} — go to home page`}
          >
            {header?.logo?.url ? (
              <Image
                src={header.logo.url}
                alt={header.logo.title ?? siteName}
                width={32}
                height={32}
                className="notch-sm h-8 w-8 object-cover"
                {...header.$?.logo}
              />
            ) : (
              <LogoMark />
            )}
            {/* Wordmark hides below sm: in Chakra Petch caps it is ~117px wide, which
                pushed the header past a 320px viewport (WCAG 1.4.10 Reflow). The
                logo mark stays, and the link's aria-label already carries the
                site name, so nothing is lost for assistive tech. */}
            <span className="hidden sm:inline font-display text-xl uppercase">{siteName}</span>
          </Link>

          {/* Desktop nav */}
          <Nav links={NAV_LINKS} pathname={pathname} variant="desktop" />

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {header?.cta_label && header?.cta_url && (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={header.cta_url} {...header.$?.cta_label}>
                  {header.cta_label}
                </Link>
              </Button>
            )}

            {showSearch && (
              <IconButton asChild variant="ghost" size="pad" label="Search titles">
                <Link href="/search">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </Link>
              </IconButton>
            )}

            <ThemeToggle />

            {showProfile && (
              <IconButton asChild variant="ghost" size="pad" label="User profile">
                <Link href="/profile">
                  <User className="h-5 w-5" aria-hidden="true" />
                </Link>
              </IconButton>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              className="md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <Nav
          links={NAV_LINKS}
          pathname={pathname}
          variant="mobile"
          onLinkClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}
