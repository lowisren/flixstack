import { Suspense } from "react";
import { Hero } from "@/components/streaming/hero";
import { Rail } from "@/components/streaming/rail";
import { HeroSkeleton, Skeleton, SkeletonGroup, TitleCardSkeleton } from "@/components/ui/skeleton";
import { getHeroBanners, getHomepageRails, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { isCSConfigured } from "@/lib/contentstack/client";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Layers, Zap, Users, Bot } from "lucide-react";
import type { LivePreviewQuery } from "@contentstack/delivery-sdk";

function FeatureCallouts() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-secondary">
          <span className="text-accent" aria-hidden="true">{"// "}</span>
          Contentstack modules on this page
        </h2>
        {!isCSConfigured && (
          <Badge variant="outline" className="text-xs">
            Using mock data —{" "}
            <Link href="/setup" className="text-accent underline underline-offset-2">
              connect ContentStack
            </Link>
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Layers, label: "Modular Blocks", desc: "Each rail is a modular block entry", href: "/setup#modular-blocks" },
          { icon: Zap, label: "Global Fields", desc: "Navigation uses a global field", href: "/setup#global-fields" },
          { icon: Users, label: "Lytics Segments", desc: "Hero varies by audience segment", href: "/setup#personalization" },
          { icon: Bot, label: "Agent OS", desc: "Auto-tagging & availability automations", href: "/setup#automations" },
        ].map(({ icon: Icon, label, desc, href }) => (
          <Link
            key={label}
            href={href}
            className="notch-sm group flex flex-col gap-2 border border-border-control bg-surface p-3 transition-colors hover:border-accent hover:bg-accent-subtle"
          >
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary transition-colors group-hover:text-accent">
                {label}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
            </div>
          </Link>
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
        <div key={i} className="px-4 sm:px-6 lg:px-8">
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

      <hr className="border-border mx-4 sm:mx-6 lg:mx-8" />

      <Suspense fallback={<RailSkeletonGroup />}>
        <HomeRails livePreview={livePreview} />
      </Suspense>
    </>
  );
}
