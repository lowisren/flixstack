import Image from "next/image";
import { Badge } from "../primitives/badge";
import { Eyebrow, SlashMarker } from "../primitives/eyebrow";
import { Heading } from "../primitives/heading";
import { Panel } from "../primitives/panel";
import { TextLink } from "../primitives/text-link";

export interface ProfileCardUser {
  name: string;
  email: string;
  avatar: string;
  subscription_tier: "free" | "premium";
  /** Lytics audience segment ids, e.g. "action_fan". */
  segments: string[];
}

/** Avatar, account details, tier and the visitor's Lytics audience segments. */
export function ProfileCard({ user }: { user: ProfileCardUser }) {
  return (
    <Panel as="section" padding="md" aria-label="Profile information">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-pod overflow-hidden bg-elevated">
            <Image
              src={user.avatar}
              alt={`${user.name} avatar`}
              width={64}
              height={64}
              className="object-cover"
              unoptimized
            />
          </div>
          <div
            role="img"
            aria-label="Online"
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-pod bg-accent border-2 border-(--color-bg-surface)"
          />
        </div>
        <div>
          <Heading as="h2" size="lg">
            {user.name}
          </Heading>
          <p className="font-mono text-xs text-text-secondary">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Badge variant="premium">{user.subscription_tier === "premium" ? "Premium" : "Free"}</Badge>
      </div>

      <div>
        <Eyebrow as="h3" tracking="widest" weight="semibold" className="mb-2">
          <SlashMarker trailingSpace />
          Audience segments (Lytics)
        </Eyebrow>
        <div className="flex flex-wrap gap-2">
          {user.segments.map((seg) => (
            <Badge key={seg} variant="accent" className="text-xs">
              {seg.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-2">
          These segments drive personalized content on your home page.{" "}
          <TextLink href="/setup#personalization">Learn more →</TextLink>
        </p>
      </div>
    </Panel>
  );
}
