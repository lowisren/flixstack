import { getAllTitles, getAllGenres, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { ProfileClient } from "./profile-client";

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);
  const [titles, genres] = await Promise.all([
    getAllTitles(livePreview),
    getAllGenres(livePreview),
  ]);

  // No watchlist/watch-history persistence exists yet — demo a real CMS-backed
  // page by seeding both lists from live titles rather than hardcoded mock uids.
  const watchlist = titles.slice(0, 4);
  const history = titles.slice(4, 8);

  return <ProfileClient watchlist={watchlist} history={history} genres={genres} />;
}
