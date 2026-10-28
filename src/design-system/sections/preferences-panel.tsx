"use client";

import { useState } from "react";
import { Bell, CheckCircle, Play, Settings, Sparkles } from "lucide-react";
import { Button } from "../primitives/button";
import { Eyebrow } from "../primitives/eyebrow";
import { Heading } from "../primitives/heading";
import { Panel } from "../primitives/panel";
import { Switch } from "../primitives/switch";
import { ToggleChip } from "../primitives/toggle-chip";
import { SettingRow } from "../patterns/setting-row";
import { ReduceEffectsToggle } from "../patterns/reduce-effects-toggle";
import type { Genre } from "@/lib/types";

export interface Preferences {
  /** Favourite genre slugs. */
  genres: string[];
  notifications: boolean;
  autoplay: boolean;
}

/**
 * Viewing preferences: favourite genres (which feed Lytics), notification and
 * autoplay switches, and the reduce-effects preference.
 *
 * Saving is a demo — there is no persistence yet — so it only confirms.
 */
export function PreferencesPanel({ genres, initial }: { genres: Genre[]; initial: Preferences }) {
  const [activeGenres, setActiveGenres] = useState<string[]>(initial.genres);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [autoplay, setAutoplay] = useState(initial.autoplay);
  const [saved, setSaved] = useState(false);

  const toggleGenre = (slug: string) => {
    setActiveGenres((prev) => (prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Panel as="section" padding="md" aria-label="Content preferences" id="preferences">
      <Heading as="h2" className="mb-4 flex items-center gap-2">
        <Settings className="h-4 w-4 text-accent" aria-hidden="true" />
        Preferences
      </Heading>

      <div className="mb-5">
        <Eyebrow tracking="widest" className="mb-3">
          Favorite genres
        </Eyebrow>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select favorite genres">
          {genres.map((genre) => (
            <ToggleChip
              key={genre.uid}
              size="sm"
              pressed={activeGenres.includes(genre.slug)}
              onClick={() => toggleGenre(genre.slug)}
            >
              {genre.title}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SettingRow icon={Bell} label="Email Notifications" description="New releases and recommendations">
          <Switch checked={notifications} onCheckedChange={setNotifications} label="Email Notifications" />
        </SettingRow>
        <SettingRow icon={Play} label="Autoplay Next Episode" description="Automatically play the next episode">
          <Switch checked={autoplay} onCheckedChange={setAutoplay} label="Autoplay Next Episode" />
        </SettingRow>
        {/* Reduce effects keeps its state on <html> + localStorage rather than
            here, so the pre-hydration script can apply it before first paint. */}
        <SettingRow icon={Sparkles} label="Reduce Effects" description="Turn off scanlines, grain and glow">
          <ReduceEffectsToggle />
        </SettingRow>
      </div>

      <Button className="w-full mt-5" onClick={handleSave} aria-label="Save preferences">
        {saved ? (
          <>
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            Saved!
          </>
        ) : (
          "Save Preferences"
        )}
      </Button>
    </Panel>
  );
}
