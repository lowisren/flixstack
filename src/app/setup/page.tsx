import { CheckCircle, Circle, ExternalLink, Layers, Users, Bot, Zap, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isCSConfigured } from "@/lib/contentstack/client";

const STEPS = [
  {
    id: 1,
    title: "Create a ContentStack Stack",
    description: "A stack is your project workspace in ContentStack. Think of it as your database + API in one.",
    detail: "Sign in to ContentStack → Click 'New Stack' → Name it 'Flixstack' → Choose your region.",
    code: null,
    docsHref: "https://www.contentstack.com/docs/developers/create-stack",
  },
  {
    id: 2,
    title: "Import the Content Models",
    description: "Import the pre-built schema from content-models/export.json into your stack.",
    detail: "In your stack → Settings → Import/Export → Import stack → Upload content-models/export.json",
    code: null,
    docsHref: "https://www.contentstack.com/docs/developers/apis/content-management-api",
  },
  {
    id: 3,
    title: "Configure Environment Variables",
    description: "Copy your API credentials from ContentStack and add them to .env.local.",
    detail: null,
    code: `# .env.local
NEXT_PUBLIC_CONTENTSTACK_API_KEY=your_api_key
NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT=production
NEXT_PUBLIC_CONTENTSTACK_REGION=US  # or EU, AZURE_NA, AZURE_EU, GCP_NA, GCP_EU

# Required for Live Preview / Visual Builder — server-only, no NEXT_PUBLIC_ prefix
CONTENTSTACK_PREVIEW_TOKEN=your_preview_token

# Optional: Lytics integration
NEXT_PUBLIC_CONTENTSTACK_LYTICS_ACCOUNT_ID=your_lytics_id
NEXT_PUBLIC_CONTENTSTACK_LYTICS_API_KEY=your_lytics_server_key`,
    docsHref: "https://www.contentstack.com/docs/developers/apis/content-delivery-api",
  },
  {
    id: 4,
    title: "Seed Sample Content",
    description: "Run the seed script to populate your stack with movies, shows, genres, and people.",
    detail: null,
    code: `# Install Management SDK dependencies first
pnpm install

# Run the seed script
pnpm seed

# This creates:
# - 5 genres, 20 movies, 3 TV series
# - 10 cast/crew entries
# - Hero banners and homepage rail configuration`,
    docsHref: null,
  },
  {
    id: 5,
    title: "Connect Lytics (Optional)",
    description: "Enable audience segmentation and personalized content by connecting your Lytics workspace.",
    detail: "Create a Lytics account → Get your Account ID → Add NEXT_PUBLIC_LYTICS_ACCOUNT_ID to .env.local. The site will automatically track title views, search queries, and playback events.",
    code: null,
    docsHref: "https://docs.lytics.com",
  },
  {
    id: 6,
    title: "Run the App",
    description: "Start the development server and explore the site with ContentStack Inspector enabled.",
    detail: null,
    code: `pnpm dev
# → http://localhost:3000

# Open any entry in ContentStack and launch Visual Builder
# to see and edit it live against this running app`,
    docsHref: null,
  },
];

const FEATURES = [
  {
    id: "content-models",
    icon: Database,
    title: "Content Models",
    description: "12 structured content types define every piece of content on the site — from a single movie to a full homepage rail. Each type has strongly typed fields: Short Text, Rich Text, File, Reference, Select, and Group.",
    fields: ["movie", "tv_series", "season", "episode", "person", "genre", "hero_banner", "homepage_rail", "page", "site_config", "header", "footer"],
    learnHref: "https://www.contentstack.com/docs/developers/create-a-content-type",
  },
  {
    id: "modular-blocks",
    icon: Layers,
    title: "Modular Blocks",
    description: "Homepage rails, hero banners, and promo sections are modular blocks — composable page sections that editors can arrange freely without engineering changes. Open Dev Mode and click any rail to see its block type.",
    fields: ["hero_block", "rail_block", "promo_block", "genre_spotlight_block"],
    learnHref: "https://www.contentstack.com/docs/developers/create-a-content-type/understand-modular-blocks",
  },
  {
    id: "global-fields",
    icon: Zap,
    title: "Global Fields",
    description: "SEO metadata and availability windows are global fields — reusable field groups shared across multiple content types.",
    fields: ["seo", "availability_window"],
    learnHref: "https://www.contentstack.com/docs/developers/create-a-content-type/understanding-global-fields",
  },
  {
    id: "header-footer-nav",
    icon: Layers,
    title: "Header, Footer & Navigation",
    description: "The main nav and footer nav are separate, reusable navigation entries — reference one from the header content type, or from any footer column. Both are fully editable in Live Preview / Visual Builder.",
    fields: ["navigation", "header", "footer"],
    learnHref: "https://www.contentstack.com/docs/developers/references/add-a-reference-field",
  },
  {
    id: "personalization",
    icon: Users,
    title: "Personalization with Lytics",
    description: "The hero banner and featured rail adapt to five Lytics audience segments. The site tracks viewing behavior and Lytics resolves which segment a visitor belongs to — ContentStack then serves the matching content variant.",
    fields: ["action_fan", "binge_watcher", "new_user", "premium_subscriber", "lapsed_user"],
    learnHref: "https://docs.lytics.com",
  },
  {
    id: "automations",
    icon: Bot,
    title: "Agent OS & Automations",
    description: "Three Automation Hub workflows show how to automate content operations: auto-tagging new titles with AI, expiring content on a schedule, and triggering notifications when new episodes publish.",
    fields: ["Auto-tagging pipeline", "Availability expiry", "New episode notifications"],
    learnHref: "https://www.contentstack.com/docs/developers/automation-hub",
  },
];

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <Badge variant="accent" className="mb-4">Developer Guide</Badge>
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-4">
          Flixstack Setup Guide
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          Get Flixstack connected to ContentStack in under 10 minutes. This guide walks you
          through every step and explains what each ContentStack feature does in the context
          of the site.
        </p>

        {/* CS connection status */}
        <div
          className={`mt-5 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            isCSConfigured
              ? "border-[var(--color-accent)]/30 bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]"
          }`}
          role="status"
        >
          {isCSConfigured ? (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              ContentStack is connected. Flixstack is serving live CMS data.
            </>
          ) : (
            <>
              <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />
              ContentStack is not yet configured. Flixstack is using mock data. Follow the steps below.
            </>
          )}
        </div>
      </div>

      {/* Setup steps */}
      <section aria-label="Setup steps" className="mb-16">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          Setup Steps
        </h2>
        <ol className="flex flex-col gap-6" role="list">
          {STEPS.map((step) => (
            <li
              key={step.id}
              className="flex gap-5 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
            >
              <div
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] font-bold text-sm"
                aria-hidden="true"
              >
                {step.id}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--color-text-primary)] mb-1">{step.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">{step.description}</p>
                {step.detail && (
                  <p className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] rounded-lg px-4 py-3 mb-3">
                    {step.detail}
                  </p>
                )}
                {step.code && (
                  <pre className="text-xs font-mono bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-xl p-4 overflow-x-auto whitespace-pre mb-3">
                    {step.code}
                  </pre>
                )}
                {step.docsHref && (
                  <a
                    href={step.docsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    View Documentation
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Feature deep-dives */}
      <section aria-label="ContentStack features" className="mb-16">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          ContentStack Features in Flixstack
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Every feature on the site maps to a specific ContentStack capability. Open any entry in
          ContentStack and launch Visual Builder to see and edit the content model behind any
          component, live.
        </p>

        <div className="flex flex-col gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                id={feature.id}
                className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-subtle)] shrink-0">
                    <Icon className="h-5 w-5 text-[var(--color-accent)]" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--color-text-primary)] text-lg mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {feature.fields.map((f) => (
                        <code
                          key={f}
                          className="text-xs font-mono px-2 py-1 rounded-md bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                        >
                          {f}
                        </code>
                      ))}
                    </div>
                    {feature.learnHref && (
                      <a
                        href={feature.learnHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--color-focus-ring)] rounded-sm"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Learn More
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
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          Explore the Docs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Content Delivery API", href: "https://www.contentstack.com/docs/developers/apis/content-delivery-api", desc: "Fetch entries, assets, and queries" },
            { title: "Content Management API", href: "https://www.contentstack.com/docs/developers/apis/content-management-api", desc: "Create, update, publish content" },
            { title: "Automation Hub", href: "https://www.contentstack.com/docs/developers/automation-hub", desc: "Build no-code content workflows" },
            { title: "Personalize with Lytics", href: "https://www.contentstack.com/docs/developers/personalization", desc: "Audience segmentation & variants" },
          ].map((link) => (
            <a
              key={link.title}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                  {link.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{link.desc}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-[var(--color-text-disabled)] shrink-0 mt-0.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
