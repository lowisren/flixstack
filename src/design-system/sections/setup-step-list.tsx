import { ExternalLink } from "lucide-react";
import { Heading } from "../primitives/heading";
import { IconTile } from "../primitives/icon-tile";
import { Panel } from "../primitives/panel";
import { TextLink } from "../primitives/text-link";
import type { SetupStep } from "@/lib/types";

// Rich-text fields render as HTML from @contentstack/utils; these child
// selectors space the paragraphs inside them.
const richText = "break-words [&_p]:mb-2 [&_p:last-child]:mb-0";

/** The numbered setup guide steps on /setup. Every field is CMS-editable. */
export function SetupStepList({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="flex flex-col gap-6" role="list">
      {steps.map((step, i) => (
        <Panel as="li" key={i} className="flex gap-4 sm:gap-5 p-4 sm:p-6">
          <IconTile className="shrink-0 font-mono font-bold text-sm tabular-nums" aria-hidden="true">
            {i + 1}
          </IconTile>
          <div className="flex-1 min-w-0 break-words">
            <Heading as="h3" className="mb-1" {...step.$?.heading}>
              {step.heading}
            </Heading>
            <div
              className={`text-sm text-text-secondary mb-3 ${richText}`}
              dangerouslySetInnerHTML={{ __html: step.description }}
              {...step.$?.description}
            />
            {step.detail && (
              <div
                className={`text-sm text-text-secondary bg-elevated rounded-panel px-4 py-3 mb-3 ${richText}`}
                dangerouslySetInnerHTML={{ __html: step.detail }}
                {...step.$?.detail}
              />
            )}
            {step.code && (
              <pre
                className="text-xs font-mono bg-elevated border border-border-control text-text-primary rounded-panel p-4 overflow-x-auto whitespace-pre mb-3"
                {...step.$?.code}
              >
                {step.code}
              </pre>
            )}
            {step.docs_link && (
              <TextLink
                variant="action"
                href={step.docs_link.href}
                newTab={step.docs_link.open_in_new_tab}
                className="inline-flex items-center gap-1.5"
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {step.docs_link.label || "View Documentation"}
              </TextLink>
            )}
          </div>
        </Panel>
      ))}
    </ol>
  );
}
