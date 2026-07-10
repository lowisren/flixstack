"use client";

import { useState } from "react";
import Image from "next/image";
import { Bell, Play, Heart, Settings, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TitleCard } from "@/components/streaming/title-card";
import type { Genre, Movie, TvSeries } from "@/lib/types";

const MOCK_USER = {
  name: "Alex Rivera",
  email: "alex@example.com",
  avatar: "https://picsum.photos/seed/user1/100/100",
  subscription_tier: "premium" as const,
  segments: ["premium_subscriber", "action_fan"],
  preferences: {
    genres: ["action", "sci-fi"],
    notifications: true,
    autoplay: true,
  },
};

interface ProfileClientProps {
  watchlist: (Movie | TvSeries)[];
  history: (Movie | TvSeries)[];
  genres: Genre[];
}

export function ProfileClient({ watchlist, history, genres }: ProfileClientProps) {
  const [activeGenres, setActiveGenres] = useState<string[]>(MOCK_USER.preferences.genres);
  const [notifications, setNotifications] = useState(MOCK_USER.preferences.notifications);
  const [autoplay, setAutoplay] = useState(MOCK_USER.preferences.autoplay);
  const [saved, setSaved] = useState(false);

  const toggleGenre = (slug: string) => {
    setActiveGenres((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-8">
        My Profile
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: profile info */}
        <div className="flex flex-col gap-6">
          {/* Avatar card */}
          <section
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6"
            aria-label="Profile information"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-[var(--color-bg-elevated)]">
                  <Image
                    src={MOCK_USER.avatar}
                    alt={`${MOCK_USER.name} avatar`}
                    width={64}
                    height={64}
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[var(--color-accent)] border-2 border-[var(--color-bg-surface)]" aria-label="Online" />
              </div>
              <div>
                <h2 className="font-bold text-[var(--color-text-primary)] text-lg">
                  {MOCK_USER.name}
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">{MOCK_USER.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-5">
              <Badge variant="premium">
                {MOCK_USER.subscription_tier === "premium" ? "Premium" : "Free"}
              </Badge>
            </div>

            {/* Lytics segments */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-disabled)] uppercase tracking-wider mb-2">
                Audience Segments (Lytics)
              </h3>
              <div className="flex flex-wrap gap-2">
                {MOCK_USER.segments.map((seg) => (
                  <Badge key={seg} variant="accent" className="text-xs">
                    {seg.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-disabled)] mt-2">
                These segments drive personalized content on your home page.{" "}
                <a href="/setup#personalization" className="text-[var(--color-accent)] hover:underline">
                  Learn more →
                </a>
              </p>
            </div>
          </section>

          {/* Preferences */}
          <section
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6"
            aria-label="Content preferences"
            id="preferences"
          >
            <h2 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Preferences
            </h2>

            {/* Genre preferences — feed Lytics */}
            <div className="mb-5">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                Favorite Genres
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select favorite genres">
                {genres.map((genre) => {
                  const isActive = activeGenres.includes(genre.slug);
                  return (
                    <button
                      key={genre.uid}
                      onClick={() => toggleGenre(genre.slug)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] ${
                        isActive
                          ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                          : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {genre.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-4">
              {[
                { label: "Email Notifications", desc: "New releases and recommendations", value: notifications, set: setNotifications, icon: Bell },
                { label: "Autoplay Next Episode", desc: "Automatically play the next episode", value: autoplay, set: setAutoplay, icon: Play },
              ].map(({ label, desc, value, set, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 text-[var(--color-text-secondary)] mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{desc}</p>
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={value}
                    aria-label={label}
                    onClick={() => set(!value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] ${
                      value ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        value ? "translate-x-6" : "translate-x-1"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-5"
              onClick={handleSave}
              aria-label="Save preferences"
            >
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  Saved!
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </section>
        </div>

        {/* Right: watchlist + history */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Watchlist */}
          <section id="watchlist" aria-label="My watchlist">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-[var(--color-accent)]" aria-hidden="true" />
              My Watchlist
              <Badge variant="default" className="ml-auto">
                {watchlist.length}
              </Badge>
            </h2>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" role="list">
                {watchlist.map((title) => (
                  <div key={title.uid} role="listitem">
                    <TitleCard title={title} layout="portrait" data-cs-entry={title.uid} data-cs-content-type={title.content_type} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] text-sm">
                Your watchlist is empty. Browse titles and click + to add them.
              </p>
            )}
          </section>

          {/* Watch history */}
          <section id="history" aria-label="Watch history">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-[var(--color-accent)]" aria-hidden="true" />
              Continue Watching
            </h2>
            {history.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" role="list">
                {history.map((title) => (
                  <div key={title.uid} role="listitem">
                    <TitleCard title={title} layout="portrait" data-cs-entry={title.uid} data-cs-content-type={title.content_type} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)] text-sm">
                No watch history yet. Start watching something!
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
