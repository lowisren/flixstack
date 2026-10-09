import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Grid, Layers, Play, Plus, Search } from "lucide-react";
import {
  Badge,
  Button,
  CreditsPanel,
  EmptyState,
  Eyebrow,
  FallbackImage,
  GenreBanner,
  GenreSpotlight,
  Heading,
  Hero,
  IconButton,
  IconTile,
  LinkCard,
  LogoMark,
  NavLink,
  PageShell,
  Panel,
  PreferencesPanel,
  ProfileCard,
  PromoBlock,
  Rail,
  RatingBadge,
  Readout,
  ReduceEffectsToggle,
  Score,
  SectionHeader,
  Select,
  SetupStepList,
  Skeleton,
  SkeletonGroup,
  SlashMarker,
  Spinner,
  TextLink,
  ThemeToggle,
  TitleCard,
  TitleCardSkeleton,
  TitleFactsPanel,
  TitleGrid,
  VideoPlayer,
} from "@/design-system";
import { stripHtml } from "@/lib/utils";
import {
  getAllGenres,
  getAllTitles,
  getHeroBanners,
  getHomepageRails,
  getSetupGuide,
} from "@/lib/contentstack/queries";
import type { Movie, TvSeries } from "@/lib/types";
import { Specimen, Variant, specimenId } from "./_components/specimen";
import { Index, Toolbar, type TocGroup } from "./_components/toolbar";
import { TokenSwatches } from "./_components/token-swatches";
import {
  CarouselControlsDemo,
  CarouselControlsMediaDemo,
  CarouselDotsDemo,
  EpisodeListDemo,
  FilterBarDemo,
  SearchFieldDemo,
  SegmentedControlDemo,
  SettingRowDemo,
  SwitchDemo,
  TitleDetailHeaderDemo,
  ToggleChipDemo,
} from "./_components/demos";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

// Development tool: hidden from production builds unless explicitly enabled
// at build time (NEXT_PUBLIC_ vars are inlined by `next build`).
const ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DESIGN_SYSTEM === "true";

const GROUPS: TocGroup[] = [
  { id: "ds-tokens", title: "Tokens", items: ["Colour", "On-media", "Type", "Shape", "Effects", "Layout"] },
  {
    id: "ds-primitives",
    title: "Primitives",
    items: [
      "Button", "IconButton", "IconTile", "Badge", "Heading", "Eyebrow", "TextLink", "Panel",
      "Switch", "ToggleChip", "Select", "Skeleton", "Spinner", "LogoMark", "FallbackImage",
    ],
  },
  {
    id: "ds-patterns",
    title: "Patterns",
    items: [
      "SectionHeader", "CarouselControls", "CarouselDots", "SegmentedControl", "SearchField", "Score",
      "RatingBadge", "Readout", "SettingRow", "EmptyState", "LinkCard", "NavLink", "ThemeToggle",
      "ReduceEffectsToggle",
    ],
  },
  {
    id: "ds-sections",
    title: "Sections",
    items: [
      "TitleCard", "Rail", "TitleGrid", "Hero", "GenreBanner", "GenreSpotlight", "PromoBlock",
      "TitleDetailHeader", "EpisodeList", "CreditsPanel", "TitleFactsPanel", "FilterBar", "ProfileCard",
      "PreferencesPanel", "SetupStepList", "VideoPlayer", "Header, Nav & Footer",
    ],
  },
  { id: "ds-templates", title: "Templates", items: ["PageShell", "DetailTemplate", "ModularPageTemplate"] },
];

function LevelHeading({ id, title, intro }: { id: string; title: string; intro: string }) {
  return (
    <div id={id} className="scroll-mt-32 pt-12 mb-2">
      <Heading as="h2" size="2xl" className="flex items-baseline gap-2">
        <SlashMarker className="font-mono text-base" />
        {title}
      </Heading>
      <p className="text-text-secondary max-w-3xl mt-2">{intro}</p>
    </div>
  );
}

function TokenSection({ name, description, children }: { name: string; description: string; children: React.ReactNode }) {
  return (
    <section id={specimenId(name)} aria-labelledby={`${specimenId(name)}-title`} className="scroll-mt-32 border-t border-border pt-6">
      <Heading as="h3" size="lg" id={`${specimenId(name)}-title`} className="mb-1">
        {name}
      </Heading>
      <p className="text-sm text-text-secondary max-w-3xl mb-4">{description}</p>
      {children}
    </section>
  );
}

export default async function DesignSystemPage() {
  if (!ENABLED) notFound();

  const [titles, genres, banners, rails, guide] = await Promise.all([
    getAllTitles(),
    getAllGenres(),
    getHeroBanners(),
    getHomepageRails(),
    getSetupGuide(),
  ]);

  const movies = titles.filter((t): t is Movie => t.content_type === "movie");
  const series = titles.filter((t): t is TvSeries => t.content_type === "tv_series");
  const movie = movies.find((m) => m.thumbnail) ?? movies[0];
  const show = series.find((s) => s.seasons.some((season) => season.episodes.length > 0)) ?? series[0];
  const playable = movies.find((m) => m.playback);
  const genre = genres.find((g) => g.hero_image) ?? genres[0];
  const genreTitles = genre ? titles.filter((t) => t.genres.some((g) => g.slug === genre.slug)) : [];
  const rail = rails[0];

  return (
    <PageShell padding="lg">
      <Eyebrow tone="accent" tracking="widest" className="mb-2">
        Flixstack · dev only
      </Eyebrow>
      <Heading as="h1" size="4xl" className="mb-3">
        Design System
      </Heading>
      <p className="text-text-secondary max-w-3xl mb-6">
        Every token and component in <code className="font-mono text-sm">src/design-system</code>, rendered
        live with this stack&rsquo;s content. Use the toolbar to switch theme and effects; the examples respond
        exactly as the real pages do. Components marked with a <span className="font-mono text-signal">block</span>{" "}
        label render a Contentstack modular block.
      </p>

      <Toolbar groups={GROUPS} />
      <div className="py-8">
        <Index groups={GROUPS} />
      </div>

      {/* ── Tokens ───────────────────────────────────────────────────── */}
      <LevelHeading
        id="ds-tokens"
        title="Tokens"
        intro="CSS custom properties in src/design-system/tokens/, plus layout class tokens in layout.ts. Components read tokens and never hardcode colour, opacity, glow or shadow."
      />
      <div className="flex flex-col gap-10">
        <TokenSection
          name="Colour"
          description="Theme tokens with live contrast against each surface. scripts/check-contrast.mjs enforces the same thresholds in CI."
        >
          <TokenSwatches />
        </TokenSection>

        <TokenSection
          name="On-media"
          description="Fixed in both themes, for chrome on artwork. Always sits on the fixed dark scrim or ground, never on a theme surface."
        >
          <div className="bg-media-ground border border-border p-5 flex flex-col gap-2">
            <p className="text-on-media">text-on-media — titles</p>
            <p className="text-on-media/85">text-on-media/85 — subtitles</p>
            <p className="text-on-media/70 font-mono text-xs uppercase tracking-wider">text-on-media/70 — metadata</p>
            <p className="text-on-media/60 text-xs">text-on-media/60 — suffixes (lowest allowed)</p>
            <div className="flex gap-3 mt-2">
              <span className="h-8 w-16 border border-on-media/25 bg-media-shade/70" aria-hidden="true" />
              <span className="h-8 w-16 border border-on-media/30 bg-on-media/15" aria-hidden="true" />
              <span className="h-8 w-16 bg-on-media/20" aria-hidden="true" />
            </div>
          </div>
        </TokenSection>

        <TokenSection
          name="Type"
          description="Chakra Petch for headings and short labels; Geist Mono for the terminal label voice and data; Geist for running text."
        >
          <div className="flex flex-col gap-3">
            {(["4xl", "3xl", "2xl", "xl", "lg", "base", "sm"] as const).map((size) => (
              <div key={size} className="flex items-baseline gap-4">
                <span className="font-mono text-xs text-text-secondary w-12 shrink-0">{size}</span>
                <Heading as="p" size={size}>
                  Signal acquired
                </Heading>
              </div>
            ))}
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-xs text-text-secondary w-12 shrink-0">label</span>
              <Eyebrow>Eyebrow · mono label voice</Eyebrow>
            </div>
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-xs text-text-secondary w-12 shrink-0">body</span>
              <p className="text-text-secondary">Running text uses Geist at the default size and line height.</p>
            </div>
          </div>
        </TokenSection>

        <TokenSection
          name="Shape"
          description="A sharp radius scale (chip 1px, panel 2px, control 3px), the pod curve for avatars and switch thumbs, and the notched HUD corners."
        >
          <div className="flex flex-wrap items-end gap-6">
            {[
              ["rounded-chip", "chip"],
              ["rounded-panel", "panel"],
              ["rounded-control", "control"],
              ["rounded-pod", "pod"],
            ].map(([cls, label]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className={`h-12 w-12 border border-border-control bg-elevated ${cls}`} aria-hidden="true" />
                <span className="font-mono text-xs text-text-secondary">{label}</span>
              </div>
            ))}
            {[
              ["notch", "notch"],
              ["notch-sm", "notch-sm"],
            ].map(([cls, label]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className={`h-12 w-16 bg-accent ${cls}`} aria-hidden="true" />
                <span className="font-mono text-xs text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </TokenSection>

        <TokenSection
          name="Effects"
          description="Chrome-only texture, all gated by tokens: the reduce-effects toggle, prefers-reduced-motion, prefers-contrast and forced colours switch them off. Never over artwork or body copy."
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="scanlines relative h-24 border border-border bg-elevated flex items-end p-2">
              <span className="font-mono text-xs text-text-secondary">.scanlines</span>
            </div>
            <div className="grid-backdrop relative h-24 border border-border bg-surface flex items-end p-2">
              <span className="relative font-mono text-xs text-text-secondary">.grid-backdrop</span>
            </div>
            <div className="hud-frame relative h-24 border border-border bg-media-ground flex items-end p-2">
              <span className="font-mono text-xs text-on-media/70">.hud-frame</span>
            </div>
            <div className="h-24 border border-border bg-surface flex flex-col justify-end gap-2 p-2">
              <span className="glow-accent h-6 w-6 bg-elevated" aria-hidden="true" />
              <span className="font-mono text-xs text-text-secondary">.glow-accent</span>
            </div>
            <div className="h-24 border border-border bg-surface flex flex-col justify-end p-2">
              <Heading as="p" size="xl" className="chromatic" tabIndex={0}>
                Hover me
              </Heading>
              <span className="font-mono text-xs text-text-secondary">.chromatic</span>
            </div>
            <div className="h-24 border border-border bg-surface flex flex-col justify-end p-2">
              <p className="font-mono text-sm text-text-secondary terminal-caret">awaiting</p>
              <span className="font-mono text-xs text-text-secondary">.terminal-caret</span>
            </div>
            <div className="notch sweep-host relative h-24 overflow-hidden border border-border bg-elevated flex items-end p-2">
              <span className="sweep" aria-hidden="true" />
              <span className="font-mono text-xs text-text-secondary">.sweep (hover)</span>
            </div>
            <div className="h-24 border border-border bg-surface flex flex-col justify-end p-2">
              <span className="chrome-underglow relative block h-6 border-b border-border" aria-hidden="true" />
              <span className="font-mono text-xs text-text-secondary">.chrome-underglow</span>
            </div>
          </div>
        </TokenSection>

        <TokenSection
          name="Layout"
          description="Class tokens from tokens/layout.ts. Kept as Tailwind strings so cn() can still override them."
        >
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-xs font-mono">
            <dt className="text-text-primary">gutterX</dt>
            <dd className="text-text-secondary">px-4 sm:px-6 lg:px-8 — every edge-aligned block</dd>
            <dt className="text-text-primary">gutterMx</dt>
            <dd className="text-text-secondary">mx-4 sm:mx-6 lg:mx-8 — inset blocks</dd>
            <dt className="text-text-primary">containers.wide</dt>
            <dd className="text-text-secondary">max-w-screen-2xl — listings, detail pages, chrome</dd>
            <dt className="text-text-primary">containers.default</dt>
            <dd className="text-text-secondary">max-w-screen-xl — profile</dd>
            <dt className="text-text-primary">containers.narrow</dt>
            <dd className="text-text-secondary">max-w-5xl — setup guide</dd>
            <dt className="text-text-primary">containers.compact</dt>
            <dd className="text-text-secondary">max-w-md — empty states</dd>
          </dl>
        </TokenSection>
      </div>

      {/* ── Primitives ───────────────────────────────────────────────── */}
      <LevelHeading
        id="ds-primitives"
        title="Primitives"
        intro="The smallest pieces. No app data — plain props only."
      />
      <div className="flex flex-col gap-10">
        <Specimen
          name="Button"
          level="Primitive"
          source="primitives/button.tsx"
          description="Notched, mono, uppercase. Every variant carries a 1px border so mixed variants line up. asChild merges the styles onto a single child such as a Link."
          props={[
            ["variant", "primary | secondary | ghost | outline | danger | terminal | media"],
            ["size", "sm | md | lg | icon"],
            ["loading", "boolean — spinner + sr-only “Loading…”, disables the button"],
            ["asChild", "boolean"],
          ]}
        >
          <div className="flex flex-col gap-4">
            <Variant label="variants">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="terminal">Terminal</Button>
              <Button variant="danger">Danger</Button>
            </Variant>
            <Variant label="sizes">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Icon size example">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Variant>
            <Variant label="states">
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </Variant>
          </div>
        </Specimen>

        <Specimen
          name="Button (media)"
          level="Primitive"
          source="primitives/button.tsx"
          description="The secondary action on artwork."
          stage="media"
        >
          <div className="flex gap-3">
            <Button size="lg">
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              Play
            </Button>
            <Button variant="media" size="lg">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Watchlist
            </Button>
          </div>
        </Specimen>

        <Specimen
          name="IconButton"
          level="Primitive"
          source="primitives/icon-button.tsx"
          description="Square icon-only control. label is the accessible name."
          props={[
            ["label", "string — required unless hidden from assistive tech"],
            ["variant", "surface | ghost | media | glass | accent"],
            ["size", "sm | md | pad"],
            ["asChild", "boolean"],
          ]}
        >
          <div className="flex flex-col gap-4">
            <Variant label="surface · ghost">
              <IconButton label="Example surface sm" size="sm">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Example surface md">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Example ghost" variant="ghost" size="pad">
                <Search className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </Variant>
            <div className="bg-media-ground p-4 flex gap-3">
              <IconButton label="Example media" variant="media">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </IconButton>
              <IconButton label="Example glass" variant="glass">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
              <IconButton label="Example accent" variant="accent">
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        </Specimen>

        <Specimen
          name="IconTile"
          level="Primitive"
          source="primitives/icon-tile.tsx"
          description="Non-interactive notched square framing an icon or glyph: logo mark, step number, feature icon."
          props={[
            ["tone", "accent | subtle"],
            ["size", "sm | md"],
          ]}
        >
          <div className="flex gap-3">
            <IconTile className="font-mono font-bold text-sm" aria-hidden="true">
              1
            </IconTile>
            <IconTile tone="subtle" size="md" aria-hidden="true">
              <Layers className="h-5 w-5 text-accent" />
            </IconTile>
          </div>
        </Specimen>

        <Specimen
          name="Badge"
          level="Primitive"
          source="primitives/badge.tsx"
          description="Mono data label with tabular figures. Every subtle/foreground pair clears 4.5:1."
          props={[["variant", "default | accent | info | signal | premium | rating | outline"]]}
        >
          <div className="flex flex-wrap gap-2">
            {(["default", "accent", "info", "signal", "premium", "rating", "outline"] as const).map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Heading"
          level="Primitive"
          source="primitives/heading.tsx"
          description="Display-face heading. Uppercase via CSS, never in the source string. See Type above for the scale."
          props={[
            ["as", "h1 | h2 | h3 | h4 | p | span"],
            ["size", "sm | base | lg | xl | 2xl | 3xl | 4xl"],
            ["tone", "default | media"],
            ["uppercase", "boolean (default true)"],
          ]}
        >
          <div className="flex flex-col gap-2">
            <Heading as="p" size="2xl">
              Section heading
            </Heading>
            <Heading as="p" size="sm" uppercase={false}>
              Episode title, not uppercased
            </Heading>
          </div>
        </Specimen>

        <Specimen
          name="Eyebrow"
          level="Primitive"
          source="primitives/eyebrow.tsx"
          description="The terminal label voice for field labels, panel titles and status lines. SlashMarker is the decorative // prefix."
          props={[
            ["as", "p | span | h2 | h3 | dt"],
            ["tone", "secondary | primary | accent | signal | media"],
            ["tracking", "wider | widest"],
            ["weight", "normal | semibold"],
          ]}
        >
          <div className="flex flex-col gap-2">
            <Eyebrow>Secondary label</Eyebrow>
            <Eyebrow tone="primary" tracking="widest" weight="semibold">
              Panel title
            </Eyebrow>
            <Eyebrow tone="signal" tracking="widest">
              No signal
            </Eyebrow>
            <Eyebrow tracking="widest" weight="semibold">
              <SlashMarker trailingSpace />
              With slash marker
            </Eyebrow>
          </div>
        </Specimen>

        <Specimen
          name="TextLink"
          level="Primitive"
          source="primitives/text-link.tsx"
          description="inline links are underlined so they are never identified by colour alone; action links are standalone terminal-voice actions."
          props={[
            ["variant", "inline | action"],
            ["newTab", "boolean"],
          ]}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Read the <TextLink href="/setup">setup guide</TextLink> to connect your stack.
            </p>
            <TextLink variant="action" href="/browse">
              View all →
            </TextLink>
          </div>
        </Specimen>

        <Specimen
          name="Panel"
          level="Primitive"
          source="primitives/panel.tsx"
          description="The notched surface container. Always positioned, so texture pseudo-elements have a context."
          props={[
            ["as", "div | section | aside | li | details"],
            ["border", "divider | control"],
            ["padding", "none | sm | md"],
            ["scanlines", "boolean"],
          ]}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Panel padding="sm">
              <Eyebrow>border=divider padding=sm</Eyebrow>
            </Panel>
            <Panel border="control" padding="md" scanlines>
              <Eyebrow>border=control scanlines</Eyebrow>
            </Panel>
          </div>
        </Specimen>

        <Specimen
          name="Switch"
          level="Primitive"
          source="primitives/switch.tsx"
          description="role=switch toggle. Controlled. The on state shows as fill, border and thumb position."
          props={[
            ["checked", "boolean"],
            ["onCheckedChange", "(next: boolean) => void"],
            ["label", "string — accessible name"],
          ]}
        >
          <SwitchDemo />
        </Specimen>

        <Specimen
          name="ToggleChip"
          level="Primitive"
          source="primitives/toggle-chip.tsx"
          description="aria-pressed chip for independent on/off choices. For one-of-many, use SegmentedControl."
          props={[
            ["pressed", "boolean"],
            ["size", "sm | md"],
          ]}
        >
          <ToggleChipDemo labels={genres.slice(0, 4).map((g) => g.title)} />
        </Specimen>

        <Specimen
          name="Select"
          level="Primitive"
          source="primitives/select.tsx"
          description="Native select in the terminal voice — keeps platform keyboard and mobile picker behaviour."
        >
          <label className="flex items-center gap-2 text-sm">
            <Eyebrow as="span">Sort:</Eyebrow>
            <Select defaultValue="score" aria-label="Example sort">
              <option value="score">Top Rated</option>
              <option value="date">Newest First</option>
            </Select>
          </label>
        </Specimen>

        <Specimen
          name="Skeleton"
          level="Primitive"
          source="primitives/skeleton.tsx"
          description="Loading placeholders. Individual skeletons are hidden from assistive tech; SkeletonGroup carries the single live region."
        >
          <SkeletonGroup label="Loading example…" className="flex gap-4">
            <div className="w-70 shrink-0">
              <TitleCardSkeleton />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </SkeletonGroup>
        </Specimen>

        <Specimen
          name="Spinner"
          level="Primitive"
          source="primitives/spinner.tsx"
          description="Decorative loading ring; the owning control announces the state."
        >
          <span className="text-accent">
            <Spinner />
          </span>
        </Specimen>

        <Specimen
          name="LogoMark"
          level="Primitive"
          source="primitives/logo-mark.tsx"
          description="The Flixstack mark. Decorative — the wrapping link carries the site name."
        >
          <LogoMark />
        </Specimen>

        <Specimen
          name="FallbackImage"
          level="Primitive"
          source="primitives/fallback-image.tsx"
          description="next/image that swaps to a placeholder when the asset fails to load. The example points at a missing asset on purpose."
        >
          <div className="relative h-24 w-40 bg-elevated">
            <FallbackImage
              src="https://images.contentstack.io/v3/assets/example/missing/missing.jpg"
              alt="Missing example asset"
              fill
              unoptimized
              fallback={
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-8 w-8 text-text-disabled" aria-hidden="true" />
                </div>
              }
            />
          </div>
        </Specimen>
      </div>

      {/* ── Patterns ─────────────────────────────────────────────────── */}
      <LevelHeading
        id="ds-patterns"
        title="Patterns"
        intro="Small combinations of primitives. Still no app data."
      />
      <div className="flex flex-col gap-10">
        <Specimen
          name="SectionHeader"
          level="Pattern"
          source="patterns/section-header.tsx"
          description="// TITLE header with trailing actions. The marker sits beside the heading so a Live Preview tag binds to the title text alone."
          cms={Boolean(rail?.$?.title)}
          props={[
            ["title", "string"],
            ["editable", "CslpTag"],
            ["actions", "ReactNode"],
          ]}
        >
          <SectionHeader title={rail?.title ?? "Trending Now"} editable={rail?.$?.title} />
        </Specimen>

        <Specimen
          name="CarouselControls"
          level="Pattern"
          source="patterns/carousel-controls.tsx"
          description="Previous/next pair: surface for rails, media for the hero."
          props={[
            ["onPrevious / onNext", "() => void"],
            ["previousLabel / nextLabel", "string"],
            ["variant", "surface | media"],
          ]}
        >
          <div className="flex flex-col gap-4">
            <CarouselControlsDemo />
            <div className="bg-media-ground p-4 w-fit">
              <CarouselControlsMediaDemo />
            </div>
          </div>
        </Specimen>

        <Specimen
          name="CarouselDots"
          level="Pattern"
          source="patterns/carousel-dots.tsx"
          description="Slide indicators as a tablist. The active dot is wider, not only coloured."
          stage="media"
        >
          <CarouselDotsDemo />
        </Specimen>

        <Specimen
          name="SegmentedControl"
          level="Pattern"
          source="patterns/segmented-control.tsx"
          description="One-of-many choice as a radiogroup."
          props={[
            ["label", "string"],
            ["options", "{ value, label }[]"],
            ["value / onChange", "T / (value: T) => void"],
          ]}
        >
          <SegmentedControlDemo />
        </Specimen>

        <Specimen
          name="SearchField"
          level="Pattern"
          source="patterns/search-field.tsx"
          description="Terminal-prompt search input with a clear button. The notched wrapper draws the focus ring."
          props={[
            ["id / label", "string"],
            ["value / onValueChange", "string / (value: string) => void"],
          ]}
        >
          <SearchFieldDemo />
        </Specimen>

        <Specimen
          name="Score"
          level="Pattern"
          source="patterns/score.tsx"
          description="Audience score. compact sits in a card's metadata row; hero sits on artwork with a /100 suffix."
          props={[
            ["value", "number (0–100)"],
            ["size", "compact | hero"],
          ]}
        >
          <div className="flex flex-col gap-3">
            <div className="flex font-mono text-xs tabular-nums">
              <Score value={87} />
            </div>
            <div className="bg-media-ground p-4 w-fit">
              <Score value={87} size="hero" />
            </div>
          </div>
        </Specimen>

        <Specimen
          name="RatingBadge"
          level="Pattern"
          source="patterns/rating-badge.tsx"
          description="Content rating, coloured from verified tokens. The text always carries the meaning."
        >
          <div className="flex gap-2">
            {["G", "PG", "PG-13", "R", "TV-MA", "NR"].map((r) => (
              <RatingBadge key={r} rating={r} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Readout"
          level="Pattern"
          source="patterns/readout.tsx"
          description="Bracketed terminal readout for counts."
        >
          <Readout>{titles.length} titles available</Readout>
        </Specimen>

        <Specimen
          name="SettingRow"
          level="Pattern"
          source="patterns/setting-row.tsx"
          description="A labelled preference with its control."
        >
          <SettingRowDemo />
        </Specimen>

        <Specimen
          name="EmptyState"
          level="Pattern"
          source="patterns/empty-state.tsx"
          description="The “No signal” panel for empty lists and searches."
          props={[
            ["icon", "LucideIcon"],
            ["signal / title / description", "ReactNode"],
            ["titleSize", "lg | xl"],
            ["action", "ReactNode"],
            ["spacing", "tight | loose"],
          ]}
        >
          <EmptyState
            icon={Grid}
            title="No titles found"
            description="Try adjusting your filters."
            className="mx-auto max-w-md flex flex-col items-center justify-center py-16 px-6"
          />
        </Specimen>

        <Specimen
          name="LinkCard"
          level="Pattern"
          source="patterns/link-card.tsx"
          description="A whole-card link. stacked for feature callouts, inline for documentation links."
          props={[
            ["layout", "stacked | inline"],
            ["icon", "LucideIcon"],
            ["newTab", "boolean"],
          ]}
        >
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
            <LinkCard href="/setup#modular-blocks" icon={Layers} title="Modular Blocks" description="Each rail is a modular block entry" />
            <LinkCard
              href="/setup"
              icon={ExternalLink}
              title="Setup guide"
              description="Connect your stack"
              layout="inline"
            />
          </div>
        </Specimen>

        <Specimen
          name="NavLink"
          level="Pattern"
          source="patterns/nav-link.tsx"
          description="Primary-navigation link. Active state: accent colour, underscore caret and aria-current."
        >
          <nav aria-label="Example navigation" className="flex gap-1">
            <NavLink href="/design-system" label="Active" active />
            <NavLink href="/browse" label="Inactive" active={false} />
          </nav>
        </Specimen>

        <Specimen
          name="ThemeToggle"
          level="Pattern"
          source="patterns/theme-toggle.tsx"
          description="Day/night switch. Label and icon describe the action. This is the same control as the header's."
        >
          <ThemeToggle />
        </Specimen>

        <Specimen
          name="ReduceEffectsToggle"
          level="Pattern"
          source="patterns/reduce-effects-toggle.tsx"
          description="The reduce-effects preference, stored on <html> + localStorage. Never a substitute for prefers-reduced-motion, which always wins."
        >
          <ReduceEffectsToggle />
        </Specimen>
      </div>

      {/* ── Sections ─────────────────────────────────────────────────── */}
      <LevelHeading
        id="ds-sections"
        title="Sections"
        intro="Page sections. These may take Contentstack content types, and carry Live Preview edit tags for every CMS field they render."
      />
      <div className="flex flex-col gap-10">
        {movie && (
          <Specimen
            name="TitleCard"
            level="Section"
            source="sections/title-card.tsx"
            description="Movie or series card. A server component; only the image fallback is client-side."
            cms
            props={[
              ["title", "Movie | TvSeries"],
              ["layout", "landscape | portrait"],
              ["fullWidth", "boolean"],
            ]}
          >
            <div className="flex flex-wrap items-start gap-4">
              <TitleCard title={movie} />
              <TitleCard title={movie} layout="portrait" />
              {show && <TitleCard title={show} layout="portrait" />}
            </div>
          </Specimen>
        )}

        {rail && (
          <Specimen
            name="Rail"
            level="Section"
            source="sections/rail.tsx"
            description="Titled, horizontally scrolling row of cards. Arrow keys scroll it."
            block="rail_block"
            cms
            stage="none"
          >
            <Rail rail={rail} data-cs-entry={rail.uid} />
          </Specimen>
        )}

        <Specimen
          name="TitleGrid"
          level="Section"
          source="sections/title-grid.tsx"
          description="Responsive grid of cards, exposed as a list."
          cms
          props={[["columns", "landscape-4 | portrait-4 | portrait-5 | portrait-6"]]}
        >
          <TitleGrid titles={titles.slice(0, 5)} columns="portrait-5" label="Example titles" />
        </Specimen>

        {banners.length > 0 && (
          <Specimen
            name="Hero"
            level="Section"
            source="sections/hero.tsx"
            description="Rotating featured banner. Copy sits on a fixed dark scrim, so contrast never depends on the artwork."
            block="hero_block"
            cms
            stage="none"
          >
            <Hero banners={banners} />
          </Specimen>
        )}

        {genre && (
          <Specimen
            name="GenreBanner"
            level="Section"
            source="sections/genre-banner.tsx"
            description="Genre page header: artwork, editor-chosen identity tint, and the title on the fixed scrim."
            cms
            stage="none"
          >
            <GenreBanner genre={genre} />
          </Specimen>
        )}

        {genre && (
          <Specimen
            name="GenreSpotlight"
            level="Section"
            source="sections/genre-spotlight.tsx"
            description="Genre heading with its identity colour and a rail of its titles."
            block="genre_spotlight_block"
            cms
            stage="none"
          >
            <GenreSpotlight spotlight={{ uid: "ds-spotlight", genre, items: genreTitles }} />
          </Specimen>
        )}

        {movie && (
          <Specimen
            name="PromoBlock"
            level="Section"
            source="sections/promo-block.tsx"
            description="Editorial promo with headline, body, CTA and image. The example is composed from a title's fields."
            block="promo_block"
            stage="none"
          >
            <PromoBlock
              promo={{
                uid: "ds-promo",
                headline: movie.title,
                body: stripHtml(movie.synopsis),
                image: movie.hero_image,
                cta_label: "Watch now",
                cta_url: `/watch/${movie.slug}`,
                layout: "left",
              }}
            />
          </Specimen>
        )}

        {movie && (
          <Specimen
            name="TitleDetailHeader"
            level="Section"
            source="sections/title-detail-header.tsx"
            description="The artwork header on a watch page."
            cms
            stage="none"
          >
            <TitleDetailHeaderDemo title={movie} />
          </Specimen>
        )}

        {show && (
          <Specimen
            name="EpisodeList"
            level="Section"
            source="sections/episode-list.tsx"
            description="Seasons as native <details> disclosures. Click a playable thumbnail to mark it Now Playing."
            cms
          >
            <EpisodeListDemo seasons={show.seasons} />
          </Specimen>
        )}

        {movie && (
          <Specimen
            name="CreditsPanel"
            level="Section"
            source="sections/credits-panel.tsx"
            description="Cast & Crew sidebar panel."
            cms
          >
            <div className="max-w-sm">
              <CreditsPanel lead={movie.director} leadRole="Director" cast={movie.cast} />
            </div>
          </Specimen>
        )}

        {movie && (
          <Specimen
            name="TitleFactsPanel"
            level="Section"
            source="sections/title-facts-panel.tsx"
            description="Details sidebar panel: release, rating, runtime or status, and tier."
          >
            <div className="max-w-sm">
              <TitleFactsPanel title={movie} />
            </div>
          </Specimen>
        )}

        <Specimen
          name="FilterBar"
          level="Section"
          source="sections/filter-bar.tsx"
          description="Catalog controls: content type, tier and sort order."
        >
          <FilterBarDemo />
        </Specimen>

        <Specimen
          name="ProfileCard"
          level="Section"
          source="sections/profile-card.tsx"
          description="Account details and the visitor's Lytics audience segments."
        >
          <div className="max-w-sm">
            <ProfileCard
              user={{
                name: "Alex Rivera",
                email: "alex@example.com",
                avatar: "https://picsum.photos/seed/user1/100/100",
                subscription_tier: "premium",
                segments: ["premium_subscriber", "action_fan"],
              }}
            />
          </div>
        </Specimen>

        <Specimen
          name="PreferencesPanel"
          level="Section"
          source="sections/preferences-panel.tsx"
          description="Favourite genres, notification and autoplay switches, and the reduce-effects preference."
        >
          <div className="max-w-sm">
            <PreferencesPanel
              genres={genres.slice(0, 6)}
              initial={{ genres: genres.slice(0, 1).map((g) => g.slug), notifications: true, autoplay: false }}
            />
          </div>
        </Specimen>

        <Specimen
          name="SetupStepList"
          level="Section"
          source="sections/setup-step-list.tsx"
          description="Numbered setup steps. Every field is CMS-editable."
          cms={guide.steps.some((s) => s.$)}
        >
          <SetupStepList steps={guide.steps.slice(0, 2)} />
        </Specimen>

        <Specimen
          name="VideoPlayer"
          level="Section"
          source="sections/video-player.tsx"
          description="Native <video> with caption tracks. Native controls on purpose: replacing them regresses keyboard, screen-reader and caption support."
        >
          {playable?.playback ? (
            <div className="aspect-video max-w-2xl">
              <VideoPlayer playback={playable.playback} label={playable.title} autoPlay={false} />
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No title in this stack has a playback source yet.</p>
          )}
        </Specimen>

        <Specimen
          name="Header, Nav & Footer"
          level="Section"
          source="sections/header.tsx, nav.tsx, footer.tsx"
          description="The site chrome, rendered around this page. Navigation and footer columns come from Contentstack."
          stage="none"
        >
          <p className="text-sm text-text-secondary">See the header and footer of this page.</p>
        </Specimen>
      </div>

      {/* ── Templates ────────────────────────────────────────────────── */}
      <LevelHeading
        id="ds-templates"
        title="Templates"
        intro="Page layouts. No data fetching — pages fetch, then hand content to a template."
      />
      <div className="flex flex-col gap-10">
        <Specimen
          name="PageShell"
          level="Template"
          source="templates/page-shell.tsx"
          description="Content container: max width, page gutter and vertical rhythm. This page is a PageShell. Used by browse, search, genre, profile and setup."
          props={[
            ["width", "wide | default | narrow | compact"],
            ["padding", "md | lg"],
          ]}
        >
          <Wireframe rows={[["Container · gutter · py"]]} />
        </Specimen>
        <Specimen
          name="DetailTemplate"
          level="Template"
          source="templates/detail-template.tsx"
          description="Full-bleed hero, then a main column and a sidebar, then full-width content. Used by /watch/[slug]."
          props={[["hero / main / aside / after", "ReactNode"]]}
        >
          <Wireframe rows={[["hero"], ["main", "main", "aside"], ["after"]]} />
        </Specimen>
        <Specimen
          name="ModularPageTemplate"
          level="Template"
          source="templates/modular-page-template.tsx"
          description="CMS-composed landing page: title, then editor-ordered modular blocks. Used by /movie and /tv-show."
          props={[
            ["title", "string"],
            ["editable", "CslpTag"],
            ["children", "the rendered blocks"],
          ]}
        >
          <Wireframe rows={[["title"], ["block"], ["block"], ["block"]]} />
        </Specimen>
      </div>
    </PageShell>
  );
}

function Wireframe({ rows }: { rows: string[][] }) {
  return (
    <div className="flex flex-col gap-2 max-w-xl" aria-hidden="true">
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
          {row.map((cell, j) => (
            <div key={j} className="border border-dashed border-border-control px-3 py-2 font-mono text-xs text-text-secondary">
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
