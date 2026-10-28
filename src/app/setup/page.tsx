import { CheckCircle, Circle, ExternalLink, Layers, Users, Bot, Zap, Database, Tags, type LucideIcon } from "lucide-react";
import { Badge, Heading, IconTile, LinkCard, PageShell, Panel, SetupStepList, TextLink } from "@/design-system";
import { isCSConfigured } from "@/lib/contentstack/client";
import { getSetupGuide, parseLivePreviewParams } from "@/lib/contentstack/queries";

// Maps the governed `icon` enum on each feature to its Lucide component. Editors can
// only pick a key that exists here (the field is a Select, not free text).
const ICON_MAP: Record<string, LucideIcon> = {
  database: Database,
  layers: Layers,
  zap: Zap,
  tags: Tags,
  users: Users,
  bot: Bot,
};

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guide = await getSetupGuide(parseLivePreviewParams(await searchParams));

  return (
    <PageShell width="narrow" padding="lg" className="grid-backdrop relative">
      {/* Header */}
      <div className="mb-10">
        {guide.badge_label && (
          <Badge variant="accent" className="mb-4" {...guide.$?.badge_label}>
            {guide.badge_label}
          </Badge>
        )}
        <Heading as="h1" size="4xl" className="mb-4" {...guide.$?.title}>
          {guide.title}
        </Heading>
        <div
          className="text-lg text-text-secondary max-w-2xl leading-relaxed break-words [&_p]:mb-3 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: guide.intro }}
          {...guide.$?.intro}
        />

        {/* CS connection status — runtime state, not editorial content */}
        <div
          className={`notch-sm mt-5 flex items-center gap-3 px-4 py-3 border font-mono text-xs uppercase tracking-wider ${
            isCSConfigured
              ? "border-accent/30 bg-accent-subtle text-accent"
              : "border-border bg-surface text-text-secondary"
          }`}
          role="status"
        >
          {isCSConfigured ? (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Contentstack is connected. Flixstack is serving live CMS data.
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Contentstack is not yet configured. Flixstack is using mock data. Follow the steps below.
            </>
          )}
        </div>
      </div>

      {/* Setup steps */}
      <section aria-label="Setup steps" className="mb-16">
        <Heading as="h2" size="2xl" className="mb-6" {...guide.$?.steps_heading}>
          {guide.steps_heading}
        </Heading>
        <SetupStepList steps={guide.steps} />
      </section>

      {/* Feature deep-dives */}
      <section aria-label="Contentstack features" className="mb-16">
        <Heading as="h2" size="2xl" className="mb-2" {...guide.$?.features_heading}>
          {guide.features_heading}
        </Heading>
        <div
          className="text-text-secondary mb-8 [&_p]:mb-3 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: guide.features_intro }}
          {...guide.$?.features_intro}
        />

        <div className="flex flex-col gap-6">
          {guide.features.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon] ?? Database;
            return (
              <Panel key={feature.anchor_id || i} id={feature.anchor_id} padding="md">
                <div className="flex items-start gap-4">
                  <IconTile as="div" tone="subtle" size="md" className="shrink-0">
                    <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  </IconTile>
                  <div className="flex-1">
                    <Heading as="h3" size="lg" className="mb-2" {...feature.$?.heading}>
                      {feature.heading}
                    </Heading>
                    <div
                      className="text-sm text-text-secondary leading-relaxed mb-4 [&_p]:mb-2 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: feature.description }}
                      {...feature.$?.description}
                    />
                    <div className="flex flex-wrap gap-2 mb-4">
                      {feature.field_tags.map((f) => (
                        <code
                          key={f}
                          className="text-xs font-mono px-2 py-1 rounded-chip bg-elevated text-text-primary border border-border-control"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                    {feature.learn_link && (
                      <TextLink
                        variant="action"
                        href={feature.learn_link.href}
                        newTab={feature.learn_link.open_in_new_tab}
                        className="inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {feature.learn_link.label || "Learn More"}
                      </TextLink>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <section aria-label="Documentation links">
        <Heading as="h2" size="2xl" className="mb-6" {...guide.$?.docs_heading}>
          {guide.docs_heading}
        </Heading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guide.doc_links.map((item, i) => (
            <LinkCard
              key={item.link.href || i}
              href={item.link.href}
              newTab={item.link.open_in_new_tab}
              icon={ExternalLink}
              title={item.link.label}
              description={item.description}
              layout="inline"
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
