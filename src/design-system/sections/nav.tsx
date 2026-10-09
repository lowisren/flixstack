import { NavLink } from "../patterns/nav-link";
import type { NavLinkItem } from "@/lib/types";

interface NavProps {
  links: NavLinkItem[];
  pathname: string;
  variant: "desktop" | "mobile";
  onLinkClick?: () => void;
}

/** Primary navigation — a bar on desktop, a stacked list in the mobile menu. */
export function Nav({ links, pathname, variant, onLinkClick }: NavProps) {
  // Keyed on the Contentstack per-item uid, not href: two menu items may
  // legitimately point at the same path, which would collide as a React key.
  const linkItems = links.map((link, i) => (
    <NavLink
      key={link.uid ?? `${link.href}-${i}`}
      href={link.href}
      label={link.label}
      active={pathname === link.href}
      display={variant === "mobile" ? "block" : "inline"}
      newTab={link.open_in_new_tab}
      onClick={onLinkClick}
      editable={link.$?.label}
    />
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
