"use client";

// Stateful catalog examples. Components that take handlers or controlled
// values need a client owner; these hold just enough state to be clicked.

import { useState } from "react";
import {
  CarouselControls,
  CarouselDots,
  EpisodeList,
  FilterBar,
  SearchField,
  SegmentedControl,
  SettingRow,
  Switch,
  TitleDetailHeader,
  ToggleChip,
  type ContentTypeFilter,
  type SortOption,
  type TierFilter,
} from "@/design-system";
import { Bell } from "lucide-react";
import type { Season, Title } from "@/lib/types";

export function SwitchDemo() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  return (
    <div className="flex items-center gap-6">
      <Switch checked={on} onCheckedChange={setOn} label="Example switch, initially on" />
      <Switch checked={off} onCheckedChange={setOff} label="Example switch, initially off" />
    </div>
  );
}

export function SettingRowDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="max-w-sm">
      <SettingRow icon={Bell} label="Email Notifications" description="New releases and recommendations">
        <Switch checked={on} onCheckedChange={setOn} label="Email Notifications (example)" />
      </SettingRow>
    </div>
  );
}

export function ToggleChipDemo({ labels }: { labels: string[] }) {
  const [pressed, setPressed] = useState<string[]>(labels.slice(0, 1));
  const toggle = (l: string) => setPressed((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]));
  return (
    <div className="flex flex-col gap-3">
      {(["md", "sm"] as const).map((size) => (
        <div key={size} className="flex flex-wrap gap-2" role="group" aria-label={`Toggle chips, ${size}`}>
          {labels.map((l) => (
            <ToggleChip key={l} size={size} pressed={pressed.includes(l)} onClick={() => toggle(l)}>
              {l}
            </ToggleChip>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SegmentedControlDemo() {
  const [value, setValue] = useState<"all" | "movie" | "tv_series">("all");
  return (
    <SegmentedControl
      label="Example content type"
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "All" },
        { value: "movie", label: "Movies" },
        { value: "tv_series", label: "TV Shows" },
      ]}
    />
  );
}

export function SearchFieldDemo() {
  const [value, setValue] = useState("");
  return (
    <div className="max-w-2xl">
      <SearchField
        id="ds-search-example"
        value={value}
        onValueChange={setValue}
        label="Example search field"
        placeholder="Search movies, shows, genres, cast…"
      />
    </div>
  );
}

export function CarouselControlsDemo() {
  const [n, setN] = useState(0);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <CarouselControls
        aria-label="Example rail scroll"
        onPrevious={() => setN((v) => v - 1)}
        onNext={() => setN((v) => v + 1)}
        previousLabel="Example: scroll left"
        nextLabel="Example: scroll right"
      />
      <span className="font-mono text-xs text-text-secondary tabular-nums">position {n}</span>
    </div>
  );
}

export function CarouselControlsMediaDemo() {
  return (
    <CarouselControls
      variant="media"
      onPrevious={() => {}}
      onNext={() => {}}
      previousLabel="Example: previous featured title"
      nextLabel="Example: next featured title"
    />
  );
}

export function CarouselDotsDemo() {
  const [current, setCurrent] = useState(0);
  return (
    <CarouselDots
      label="Example slides"
      slides={[1, 2, 3, 4].map((i) => ({ key: String(i), label: `Example slide ${i}` }))}
      current={current}
      onSelect={setCurrent}
    />
  );
}

export function FilterBarDemo() {
  const [type, setType] = useState<ContentTypeFilter>("all");
  const [tier, setTier] = useState<TierFilter>("all");
  const [sort, setSort] = useState<SortOption>("score");
  return (
    <FilterBar
      type={type}
      onTypeChange={setType}
      tier={tier}
      onTierChange={setTier}
      sort={sort}
      onSortChange={setSort}
    />
  );
}

export function EpisodeListDemo({ seasons }: { seasons: Season[] }) {
  const [playing, setPlaying] = useState<string | undefined>();
  return <EpisodeList seasons={seasons} playingUid={playing} onPlay={(ep) => setPlaying(ep.uid)} />;
}

export function TitleDetailHeaderDemo({ title }: { title: Title }) {
  return <TitleDetailHeader title={title} playLabel="Play" canPlay={false} onPlay={() => {}} />;
}
