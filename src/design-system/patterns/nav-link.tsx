import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CslpTag } from "@/lib/types";

export interface NavLinkProps {
  href: string;
  label: string;
  active: boolean;
  /** `block` fills its row (mobile menu); `inline` sits in a bar (desktop). */
  display?: "inline" | "block";
  newTab?: boolean;
  onClick?: () => void;
  editable?: CslpTag;
}

/**
 * A primary-navigation link. The active route is marked three ways, never by
 * colour alone: the accent colour, the underscore caret (`.nav-link`, driven
 * by aria-current in effects.css), and aria-current itself.
 */
export function NavLink({ href, label, active, display = "inline", newTab = false, onClick, editable }: NavLinkProps) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={cn(
        "nav-link relative font-mono text-xs uppercase tracking-wider transition-colors",
        display === "block" ? "block px-3 py-2" : "px-3 py-2",
        active ? "text-accent" : "text-text-secondary hover:text-text-primary"
      )}
      aria-current={active ? "page" : undefined}
      {...editable}
    >
      {label}
      {newTab && <span className="sr-only"> (opens in new tab)</span>}
    </Link>
  );
}
