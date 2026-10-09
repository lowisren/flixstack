import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 *   inline — a link inside running text: underlined, so it is never
 *            identified by colour alone (WCAG 1.4.1)
 *   action — a standalone terminal-voice action ("View all →"). It sits
 *            inside notched containers, so it takes the inset focus ring.
 */
export const textLinkClasses = {
  inline: "text-accent underline underline-offset-2",
  action: "focus-inset font-mono text-xs uppercase tracking-wider text-accent hover:underline",
};

export interface TextLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  variant?: keyof typeof textLinkClasses;
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  newTab?: boolean;
}

export function TextLink({ href, variant = "inline", newTab = false, className, ...props }: TextLinkProps) {
  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={cn(textLinkClasses[variant], className)}
      {...props}
    />
  );
}
