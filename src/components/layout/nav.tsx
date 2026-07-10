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
  const linkClassName = (href: string) =>
    cn(
      "rounded-md text-sm font-medium transition-colors",
      variant === "desktop" ? "px-3 py-2" : "block px-3 py-2",
      pathname === href
        ? "text-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
    );

  const linkItems = links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      target={link.open_in_new_tab ? "_blank" : undefined}
      rel={link.open_in_new_tab ? "noopener noreferrer" : undefined}
      onClick={onLinkClick}
      className={linkClassName(link.href)}
      aria-current={pathname === link.href ? "page" : undefined}
      {...link.$?.label}
    >
      {link.label}
    </Link>
  ));

  if (variant === "mobile") {
    return (
      <nav
        id="mobile-nav"
        aria-label="Mobile navigation"
        className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-4"
      >
        <ul className="flex flex-col gap-1" role="list">
          {links.map((link, i) => (
            <li key={link.href}>{linkItems[i]}</li>
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
