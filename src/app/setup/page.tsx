import { CheckCircle, Circle, ExternalLink, Layers, Users, Bot, Zap, Database, Tags, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        {guide.badge_label && (
          <Badge variant="accent" className="mb-4" {...guide.$?.badge_label}>
            {guide.badge_label}
          </Badge>
        )}
        <h1 className="text-4xl font-bold text-(--color-text-primary) mb-4" {...guide.$?.title}>
          {guide.title}
        </h1>
        <div
          className="text-lg text-text-secondary max-w-2xl leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: guide.intro }}
          {...guide.$?.intro}
        />

        {/* CS connection status — runtime state, not editorial content */}
        <div
          className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
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
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-6" {...guide.$?.steps_heading}>
          {guide.steps_heading}
        </h2>
        <ol className="flex flex-col gap-6" role="list">
          {guide.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-5 p-6 rounded-2xl border border-border bg-surface"
            >
              <div
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-sm"
                aria-hidden="true"
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-(--color-text-primary) mb-1" {...step.$?.heading}>
                  {step.heading}
                </h3>
                <div
                  className="text-sm text-text-secondary mb-3 [&_p]:mb-2 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: step.description }}
                  {...step.$?.description}
                />
                {step.detail && (
                  <div
                    className="text-sm text-text-secondary bg-elevated rounded-lg px-4 py-3 mb-3 [&_p]:mb-2 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: step.detail }}
                    {...step.$?.detail}
                  />
                )}
                {step.code && (
                  <pre
                    className="text-xs font-mono bg-elevated border border-border text-(--color-text-primary) rounded-xl p-4 overflow-x-auto whitespace-pre mb-3"
                    {...step.$?.code}
                  >
                    {step.code}
                  </pre>
                )}
                {step.docs_link && (
                  <a
                    href={step.docs_link.href}
                    target={step.docs_link.open_in_new_tab ? "_blank" : undefined}
                    rel={step.docs_link.open_in_new_tab ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-(--color-focus-ring) rounded-sm"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {step.docs_link.label || "View Documentation"}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Feature deep-dives */}
      <section aria-label="Contentstack features" className="mb-16">
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-2" {...guide.$?.features_heading}>
          {guide.features_heading}
        </h2>
        <div
          className="text-text-secondary mb-8 [&_p]:mb-3 [&_p:last-child]:mb-0"
          dangerouslySetInnerHTML={{ __html: guide.features_intro }}
          {...guide.$?.features_intro}
        />

        <div className="flex flex-col gap-6">
          {guide.features.map((feature, i) => {
            const Icon = ICON_MAP[feature.icon] ?? Database;
            return (
              <div
                key={feature.anchor_id || i}
                id={feature.anchor_id}
                className="p-6 rounded-2xl border border-border bg-surface"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-subtle shrink-0">
                    <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-(--color-text-primary) text-lg mb-2" {...feature.$?.heading}>
                      {feature.heading}
                    </h3>
                    <div
                      className="text-sm text-text-secondary leading-relaxed mb-4 [&_p]:mb-2 [&_p:last-child]:mb-0"
                      dangerouslySetInnerHTML={{ __html: feature.description }}
                      {...feature.$?.description}
                    />
                    <div className="flex flex-wrap gap-2 mb-4">
                      {feature.field_tags.map((f) => (
                        <code
                          key={f}
                          className="text-xs font-mono px-2 py-1 rounded-md bg-elevated text-(--color-text-primary) border border-border"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                    {feature.learn_link && (
                      <a
                        href={feature.learn_link.href}
                        target={feature.learn_link.open_in_new_tab ? "_blank" : undefined}
                        rel={feature.learn_link.open_in_new_tab ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-(--color-focus-ring) rounded-sm"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {feature.learn_link.label || "Learn More"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick links */}
      <section aria-label="Documentation links">
        <h2 className="text-2xl font-bold text-(--color-text-primary) mb-6" {...guide.$?.docs_heading}>
          {guide.docs_heading}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guide.doc_links.map((item, i) => (
            <a
              key={item.link.href || i}
              href={item.link.href}
              target={item.link.open_in_new_tab ? "_blank" : undefined}
              rel={item.link.open_in_new_tab ? "noopener noreferrer" : undefined}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent-subtle transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring)"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-(--color-text-primary) group-hover:text-accent transition-colors">
                  {item.link.label}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{item.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-text-disabled shrink-0 mt-0.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
