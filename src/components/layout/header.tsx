"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, Menu, X, Play } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Nav } from "./nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export function Header({ header, siteName = "Flixstack" }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = header?.main_navigation?.links;
  const NAV_LINKS = navLinks && navLinks.length > 0 ? navLinks : FALLBACK_NAV_LINKS;
  const showSearch = header?.show_search !== false;
  const showProfile = header?.show_profile !== false;

  return (
    <header
      className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-surface)]/95 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] rounded-md"
            aria-label={`${siteName} — go to home page`}
          >
            {header?.logo?.url ? (
              <Image
                src={header.logo.url}
                alt={header.logo.title ?? siteName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-lg object-cover"
                {...header.$?.logo}
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]"
                aria-hidden="true"
              >
                <Play className="h-4 w-4 fill-[var(--color-accent-foreground)] text-[var(--color-accent-foreground)]" />
              </span>
            )}
            <span className="text-xl font-bold tracking-tight">{siteName}</span>
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
              <Link
                href="/search"
                className={cn(
                  "inline-flex items-center justify-center p-2 rounded-lg transition-colors",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                )}
                aria-label="Search titles"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}

            <ThemeToggle />

            {showProfile && (
              <Link
                href="/profile"
                className={cn(
                  "inline-flex items-center justify-center p-2 rounded-lg transition-colors",
                  "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                )}
                aria-label="User profile"
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
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
