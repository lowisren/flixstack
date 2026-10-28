import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LinkCardProps {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * `stacked` — icon above the text (feature callouts).
   * `inline`  — text with a trailing icon (documentation links).
   */
  layout?: "stacked" | "inline";
  newTab?: boolean;
}

/**
 * A whole-card link with a title and one line of description. The card, not
 * just the title, is the target, and hover/focus states move the border and
 * fill together so the affordance is not colour-only.
 */
export function LinkCard({ href, title, description, icon: Icon, layout = "stacked", newTab = false }: LinkCardProps) {
  const stacked = layout === "stacked";
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={cn(
        "notch-sm group flex border border-border-control bg-surface transition-colors hover:border-accent hover:bg-accent-subtle",
        stacked ? "flex-col gap-2 p-3" : "items-start gap-3 p-4"
      )}
    >
      {stacked && <Icon className="h-4 w-4 text-accent" aria-hidden="true" />}
      <div className={stacked ? undefined : "flex-1"}>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors group-hover:text-accent">
          {title}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      </div>
      {!stacked && <Icon className="h-4 w-4 text-text-disabled shrink-0 mt-0.5" aria-hidden="true" />}
    </Link>
  );
}
