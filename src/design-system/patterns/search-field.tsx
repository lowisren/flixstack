import { X } from "lucide-react";

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Visible to assistive tech only; the `>` prompt is the visual cue. */
  label: string;
}

/**
 * Terminal-prompt search input with a clear button.
 *
 * No focus outline on the input itself: the border lives on the notched
 * wrapper, whose `.notch-sm:has(:focus-visible)` rule draws the inset ring —
 * an outline on the input would be clipped by the wrapper's clip-path.
 * `caret-accent` turns the native text cursor phosphor, which is a real
 * terminal caret rather than a decorative blinking block.
 */
export function SearchField({ id, value, onValueChange, label, ...inputProps }: SearchFieldProps) {
  return (
    <div className="notch-sm relative border border-border-control bg-surface">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {/* Terminal prompt. Decorative — the input keeps its own label. */}
      <span
        className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-accent"
        aria-hidden="true"
      >
        &gt;
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="w-full h-14 pl-11 pr-12 bg-transparent font-mono text-base text-text-primary caret-accent placeholder:text-text-secondary focus-visible:outline-none"
        aria-label={label}
        {...inputProps}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className="focus-inset absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-accent transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
