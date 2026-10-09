import Image from "next/image";
import { cn } from "@/lib/utils";
import { Eyebrow } from "../primitives/eyebrow";
import { Panel } from "../primitives/panel";
import type { Person } from "@/lib/types";

export interface CreditsPanelProps {
  /** The director (movie) or creator (series). */
  lead?: Person;
  leadRole: "Director" | "Creator";
  cast: Person[];
}

/** "Cast & Crew" sidebar panel. */
export function CreditsPanel({ lead, leadRole, cast }: CreditsPanelProps) {
  return (
    <Panel padding="sm">
      <Eyebrow as="h2" tracking="widest" weight="semibold" className="mb-4">
        Cast & Crew
      </Eyebrow>
      <dl className="flex flex-col gap-4">
        {lead && (
          <div>
            <Eyebrow as="dt" className="mb-1">
              {leadRole}
            </Eyebrow>
            <dd>
              <div className="flex items-center gap-2">
                <PersonCredit person={lead} emphasis />
              </div>
            </dd>
          </div>
        )}
        <div>
          <Eyebrow as="dt" className="mb-2">
            Cast
          </Eyebrow>
          <dd>
            <ul className="flex flex-col gap-2" role="list">
              {cast.map((person) => (
                <li key={person.uid} className="flex items-center gap-2">
                  <PersonCredit person={person} />
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

/** Round headshot (the eXistenZ pod curve) + name. Rendered inside a flex row. */
function PersonCredit({ person, emphasis = false }: { person: Person; emphasis?: boolean }) {
  return (
    <>
      <div className="h-8 w-8 rounded-pod overflow-hidden bg-elevated shrink-0">
        {person.photo && (
          <Image
            src={person.photo.url}
            alt={person.name}
            width={32}
            height={32}
            className="object-cover"
            {...person.$?.photo}
          />
        )}
      </div>
      <span className={cn("text-sm text-text-primary", emphasis && "font-medium")} {...person.$?.title}>
        {person.name}
      </span>
    </>
  );
}
