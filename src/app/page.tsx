import { Suspense } from "react";
import { Layers, Zap, Users, Bot } from "lucide-react";
import {
  Badge,
  Eyebrow,
  Hero,
  HeroSkeleton,
  LinkCard,
  Rail,
  Skeleton,
  SkeletonGroup,
  SlashMarker,
  TextLink,
  TitleCardSkeleton,
  gutterMx,
  gutterX,
} from "@/design-system";
import { cn } from "@/lib/utils";
import { getHeroBanners, getHomepageRails, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { isCSConfigured } from "@/lib/contentstack/client";
import type { LivePreviewQuery } from "@contentstack/delivery-sdk";

const FEATURES = [
  { icon: Layers, label: "Modular Blocks", desc: "Each rail is a modular block entry", href: "/setup#modular-blocks" },
  { icon: Zap, label: "Global Fields", desc: "Navigation uses a global field", href: "/setup#global-fields" },
  { icon: Users, label: "Lytics Segments", desc: "Hero varies by audience segment", href: "/setup#personalization" },
  { icon: Bot, label: "Agent OS", desc: "Auto-tagging & availability automations", href: "/setup#automations" },
];

function FeatureCallouts() {
  return (
    <div className={cn(gutterX, "py-6")}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Eyebrow as="h2" tracking="widest" weight="semibold">
          <SlashMarker trailingSpace />
          Contentstack modules on this page
        </Eyebrow>
        {!isCSConfigured && (
          <Badge variant="outline" className="text-xs">
            Using mock data —{" "}
            <TextLink href="/setup">connect ContentStack</TextLink>
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FEATURES.map(({ icon, label, desc, href }) => (
          <LinkCard key={label} href={href} icon={icon} title={label} description={desc} />
        ))}
      </div>
    </div>
  );
}

async function HeroSection({ livePreview }: { livePreview?: LivePreviewQuery }) {
  const banners = await getHeroBanners(livePreview);
  return <Hero banners={banners} />;
}

async function HomeRails({ livePreview }: { livePreview?: LivePreviewQuery }) {
  const rails = await getHomepageRails(livePreview);
  return (
    <div className="flex flex-col gap-10 py-8">
      {rails.map((rail) => (
        <Rail key={rail.uid} rail={rail} data-cs-entry={rail.uid} />
      ))}
    </div>
  );
}

function RailSkeletonGroup() {
  return (
    <SkeletonGroup label="Loading titles…" className="flex flex-col gap-10 py-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={gutterX}>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="shrink-0 w-70">
                <TitleCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);

  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection livePreview={livePreview} />
      </Suspense>

      <FeatureCallouts />

      <hr className={cn("border-border", gutterMx)} />

      <Suspense fallback={<RailSkeletonGroup />}>
        <HomeRails livePreview={livePreview} />
      </Suspense>
    </>
  );
}
