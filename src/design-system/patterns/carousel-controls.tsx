import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "../primitives/icon-button";

export interface CarouselControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  previousLabel: string;
  nextLabel: string;
  /** `surface` on page surfaces (rails), `media` on artwork (hero). */
  variant?: "surface" | "media";
  className?: string;
  "aria-label"?: string;
}

/** Previous / next arrow pair for rails and carousels. */
export function CarouselControls({
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  variant = "surface",
  className,
  ...props
}: CarouselControlsProps) {
  const media = variant === "media";
  const iconClass = media ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className={cn("flex items-center", media ? "gap-2" : "gap-1", className)} aria-label={props["aria-label"]}>
      <IconButton variant={variant} size={media ? "md" : "sm"} onClick={onPrevious} label={previousLabel}>
        <ChevronLeft className={iconClass} aria-hidden="true" />
      </IconButton>
      <IconButton variant={variant} size={media ? "md" : "sm"} onClick={onNext} label={nextLabel}>
        <ChevronRight className={iconClass} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
