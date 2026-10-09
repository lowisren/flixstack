import { Filter } from "lucide-react";
import { Eyebrow } from "../primitives/eyebrow";
import { Select } from "../primitives/select";
import { SegmentedControl } from "../patterns/segmented-control";

export type ContentTypeFilter = "all" | "movie" | "tv_series";
export type TierFilter = "all" | "free" | "premium";
export type SortOption = "score" | "date" | "title";

export interface FilterBarProps {
  type: ContentTypeFilter;
  onTypeChange: (value: ContentTypeFilter) => void;
  tier: TierFilter;
  onTierChange: (value: TierFilter) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

const TYPE_OPTIONS: { value: ContentTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv_series", label: "TV Shows" },
];

const TIER_OPTIONS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All Tiers" },
  { value: "free", label: "free" },
  { value: "premium", label: "premium" },
];

/** Catalog controls: content type, tier and sort order. */
export function FilterBar({ type, onTypeChange, tier, onTierChange, sort, onSortChange }: FilterBarProps) {
  return (
    <div
      className="flex flex-wrap gap-3 items-center mb-8 pb-6 border-b border-border"
      role="group"
      aria-label="Filter and sort controls"
    >
      <Filter className="h-4 w-4 text-text-secondary" aria-hidden="true" />
      <SegmentedControl label="Content type" options={TYPE_OPTIONS} value={type} onChange={onTypeChange} />
      <SegmentedControl label="Content tier" options={TIER_OPTIONS} value={tier} onChange={onTierChange} />
      <label className="flex items-center gap-2 ml-auto text-sm">
        <Eyebrow as="span">Sort:</Eyebrow>
        <Select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          aria-label="Sort titles by"
        >
          <option value="score">Top Rated</option>
          <option value="date">Newest First</option>
          <option value="title">Title A–Z</option>
        </Select>
      </label>
    </div>
  );
}
