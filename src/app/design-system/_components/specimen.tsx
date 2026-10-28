import { cn } from "@/lib/utils";
import { Eyebrow, Heading } from "@/design-system";

export type Level = "Primitive" | "Pattern" | "Section" | "Template";

const ATOMIC: Record<Level, string> = {
  Primitive: "atom",
  Pattern: "molecule",
  Section: "organism",
  Template: "template",
};

export interface SpecimenProps {
  name: string;
  level: Level;
  /** Source path under src/design-system. */
  source: string;
  description: string;
  /** Contentstack modular block this component renders, if any. */
  block?: string;
  /**
   * The example renders CMS fields, so it must carry Live Preview edit tags.
   * scripts/a11y.mjs asserts a `[data-cslp]` inside every such specimen
   * whenever Live Preview is on.
   */
  cms?: boolean;
  props?: [name: string, type: string][];
  /** `media` stages the example on the dark artwork ground. */
  stage?: "surface" | "media" | "none";
  children: React.ReactNode;
}

export function specimenId(name: string) {
  return `ds-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

/** One catalog entry: identity, live example, and its props. */
export function Specimen({
  name,
  level,
  source,
  description,
  block,
  cms = false,
  props,
  stage = "surface",
  children,
}: SpecimenProps) {
  return (
    <section
      id={specimenId(name)}
      aria-labelledby={`${specimenId(name)}-title`}
      className="scroll-mt-32 border-t border-border pt-6"
      data-specimen={name}
      data-specimen-cms={cms ? "" : undefined}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
        <Heading as="h3" size="lg" id={`${specimenId(name)}-title`}>
          {name}
        </Heading>
        <Eyebrow as="span" tone="accent">
          {level} · {ATOMIC[level]}
        </Eyebrow>
        {block && (
          <Eyebrow as="span" tone="signal">
            block: {block}
          </Eyebrow>
        )}
      </div>
      <p className="font-mono text-xs text-text-secondary mb-2">src/design-system/{source}</p>
      <p className="text-sm text-text-secondary max-w-3xl mb-4">{description}</p>

      <div
        className={cn(
          stage === "surface" && "border border-border bg-surface p-5",
          stage === "media" && "border border-border bg-media-ground p-5",
          "mb-4 overflow-x-auto"
        )}
      >
        {children}
      </div>

      {props && props.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-xs mb-2">
          {props.map(([prop, type]) => (
            <div key={prop} className="contents">
              <dt className="font-mono text-text-primary">{prop}</dt>
              <dd className="font-mono text-text-secondary">{type}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** A labelled row inside a specimen, for showing variants side by side. */
export function Variant({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Eyebrow as="span">{label}</Eyebrow>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
