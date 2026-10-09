import { cn } from "@/lib/utils";
import { gutterX } from "../tokens/layout";
import type { CslpTag } from "@/lib/types";

export interface ModularPageTemplateProps {
  title: string;
  /** Live Preview edit tag for the page title. */
  editable?: CslpTag;
  /** The rendered modular blocks (see components/cms/modular-block-renderer). */
  children: React.ReactNode;
}

/**
 * A CMS-composed landing page (/movie, /tv-show): a title, then the
 * editor-ordered modular blocks. The blocks are passed in rather than rendered
 * here, so the design system never depends on the CMS mapping layer.
 */
export function ModularPageTemplate({ title, editable, children }: ModularPageTemplateProps) {
  return (
    <div className="py-8">
      <div className={cn(gutterX, "mb-2")}>
        {/* Body face, not the display face — kept as shipped (strict parity);
            aligning it with other page titles is a logged follow-up. */}
        <h1 className="text-3xl font-bold text-text-primary" {...editable}>
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
