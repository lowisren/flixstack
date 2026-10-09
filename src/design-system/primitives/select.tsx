import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  ref?: React.Ref<HTMLSelectElement>;
}

/**
 * Native `<select>` in the terminal voice. Native on purpose: it keeps the
 * platform's keyboard, screen-reader and mobile picker behaviour for free.
 * The control border is --color-border-control, so its edge clears 3:1.
 */
export function Select({ className, ref, ...props }: SelectProps) {
  return (
    <select
      ref={ref}
      className={cn(
        "border border-border-control bg-elevated px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-text-primary",
        className
      )}
      {...props}
    />
  );
}
