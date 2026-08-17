"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavLinkItem } from "@/lib/types";

interface NavProps {
  links: NavLinkItem[];
  pathname: string;
  variant: "desktop" | "mobile";
  onLinkClick?: () => void;
}

export function Nav({ links, pathname, variant, onLinkClick }: NavProps) {
  // The active route is marked three ways, never by colour alone: the accent
  // colour, the underscore caret (`.nav-link`, driven by aria-current), and
  // aria-current itself for assistive tech.
  const linkClassName = (href: string) =>
    cn(
      "nav-link relative font-mono text-xs uppercase tracking-wider transition-colors",
      variant === "desktop" ? "px-3 py-2" : "block px-3 py-2",
      pathname === href
        ? "text-accent"
        : "text-text-secondary hover:text-text-primary"
    );

  // Keyed on the Contentstack per-item uid, not href: two menu items may
  // legitimately point at the same path, which would collide as a React key.
  const linkItems = links.map((link, i) => (
    <Link
      key={link.uid ?? `${link.href}-${i}`}
      href={link.href}
      target={link.open_in_new_tab ? "_blank" : undefined}
      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
      onClick={onLinkClick}
      className={linkClassName(link.href)}
      aria-current={pathname === link.href ? "page" : undefined}
      {...link.$?.label}
    >
      {link.label}
      {link.open_in_new_tab && <span className="sr-only"> (opens in new tab)</span>}
    </Link>
  ));

  if (variant === "mobile") {
    return (
      <nav
        id="mobile-nav"
        aria-label="Mobile navigation"
        className="md:hidden border-t border-border bg-surface px-4 py-4"
      >
        <ul className="flex flex-col gap-1" role="list">
          {links.map((link, i) => (
            <li key={link.uid ?? `${link.href}-${i}`}>{linkItems[i]}</li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
      {linkItems}
    </nav>
  );
}
