import { redirect } from "next/navigation";

// Contentstack's Visual Builder "Start Editing" link opens the entry's `url` field
// verbatim (e.g. `/the-bear`) against this app's configured website URL — but movie/
// tv_series content actually lives at `/watch/[slug]`. This catch-all redirects any
// unmatched root-level path there, forwarding the live_preview/entry_uid/etc query
// params Contentstack appends so the Visual Builder session survives the redirect.
export default async function RootSlugRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const query = qs.toString();

  redirect(`/watch/${slug}${query ? `?${query}` : ""}`);
}
