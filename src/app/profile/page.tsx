import { Heart, Play } from "lucide-react";
import { Badge, Heading, PageShell, PreferencesPanel, ProfileCard, TitleGrid, type ProfileCardUser } from "@/design-system";
import { getAllTitles, getAllGenres, parseLivePreviewParams } from "@/lib/contentstack/queries";

// No accounts exist yet — the profile is a demo of the personalization model.
const MOCK_USER: ProfileCardUser & { preferences: { genres: string[]; notifications: boolean; autoplay: boolean } } = {
  name: "Alex Rivera",
  email: "alex@example.com",
  avatar: "https://picsum.photos/seed/user1/100/100",
  subscription_tier: "premium",
  segments: ["premium_subscriber", "action_fan"],
  preferences: {
    genres: ["action", "sci-fi"],
    notifications: true,
    autoplay: true,
  },
};

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

  return (
    <PageShell width="default" padding="lg">
      <Heading as="h1" size="3xl" className="mb-8">
        My Profile
      </Heading>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: profile info */}
        <div className="flex flex-col gap-6">
          <ProfileCard user={MOCK_USER} />
          <PreferencesPanel genres={genres} initial={MOCK_USER.preferences} />
        </div>

        {/* Right: watchlist + history */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <section id="watchlist" aria-label="My watchlist">
            <Heading as="h2" size="xl" className="mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" aria-hidden="true" />
              My Watchlist
              <Badge variant="default" className="ml-auto">
                {watchlist.length}
              </Badge>
            </Heading>
            {watchlist.length > 0 ? (
              <TitleGrid titles={watchlist} columns="portrait-4" />
            ) : (
              <p className="text-text-secondary text-sm">
                Your watchlist is empty. Browse titles and click + to add them.
              </p>
            )}
          </section>

          <section id="history" aria-label="Watch history">
            <Heading as="h2" size="xl" className="mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-accent" aria-hidden="true" />
              Continue Watching
            </Heading>
            {history.length > 0 ? (
              <TitleGrid titles={history} columns="portrait-4" />
            ) : (
              <p className="text-text-secondary text-sm">
                No watch history yet. Start watching something!
              </p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
