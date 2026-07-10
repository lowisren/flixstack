// ============================================================
// Lytics Segment Resolution
// Used server-side to determine which content variant to serve.
// Segments are resolved via the Lytics Entity API using a
// user identifier (cookie or email).
//
// Business rationale for each segment:
//   action_fan     → Surface action content in hero + rails
//   binge_watcher  → Promote "Continue Watching" to top of page
//   new_user       → Show onboarding/welcome promo block
//   premium_subscriber → Unlock premium titles, hide upsell rail
//   lapsed_user    → "Welcome Back" hero variant
//   default        → Standard homepage experience
// ============================================================

import type { LyticsSegment } from "../types";

const LYTICS_ENTITY_API = "https://api.lytics.io/api/entity";

export async function resolveSegments(
  userId: string
): Promise<LyticsSegment[]> {
  const accountId = process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID;
  const apiKey = process.env.LYTICS_API_KEY; // server-only, not NEXT_PUBLIC_

  if (!accountId || !apiKey || !userId) return ["default"];

  try {
    const res = await fetch(
      `${LYTICS_ENTITY_API}/user/_uid/${encodeURIComponent(userId)}?key=${apiKey}`,
      { next: { revalidate: 60 } } // revalidate segment membership every minute
    );

    if (!res.ok) return ["default"];

    const data = await res.json();
    const memberSegments: string[] = data?.data?.segments ?? [];

    const known: LyticsSegment[] = [
      "action_fan",
      "binge_watcher",
      "new_user",
      "premium_subscriber",
      "lapsed_user",
    ];

    const matched = known.filter((s) => memberSegments.includes(s));
    return matched.length > 0 ? matched : ["default"];
  } catch {
    return ["default"];
  }
}

// Determine the primary segment for content decisions (priority order)
export function getPrimarySegment(segments: LyticsSegment[]): LyticsSegment {
  const priority: LyticsSegment[] = [
    "premium_subscriber",
    "new_user",
    "lapsed_user",
    "action_fan",
    "binge_watcher",
    "default",
  ];
  return priority.find((s) => segments.includes(s)) ?? "default";
}
