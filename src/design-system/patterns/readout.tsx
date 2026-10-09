import { cn } from "@/lib/utils";

/**
 * A bracketed terminal readout for counts and status: `[ 24 titles available ]`.
 * Tabular figures keep the number from shifting as it changes.
 */
export function Readout({
  as: Tag = "p",
  className,
  children,
}: {
  as?: "p" | "span";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag className={cn("font-mono text-xs uppercase tracking-widest text-accent tabular-nums", className)}>
      [ {children} ]
    </Tag>
  );
}
