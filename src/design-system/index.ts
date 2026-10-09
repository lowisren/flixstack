// Flixstack design system. See ./README.md for the structure and the rules
// every component follows; browse it live at /design-system (dev only).
//
// Levels (atomic-design names in brackets):
//   tokens      CSS custom properties + layout class tokens
//   primitives  smallest pieces, no app data              (atoms)
//   patterns    small combinations of primitives           (molecules)
//   sections    page sections; may take Contentstack types (organisms)
//   templates   page layouts, no data fetching             (templates)

// Tokens
export { gutterX, gutterMx, containers, type ContainerWidth } from "./tokens/layout";

// Primitives
export { Badge, type BadgeProps } from "./primitives/badge";
export { Button, type ButtonProps } from "./primitives/button";
export { Eyebrow, SlashMarker, type EyebrowProps } from "./primitives/eyebrow";
export { FallbackImage } from "./primitives/fallback-image";
export { Heading, type HeadingProps, type HeadingSize } from "./primitives/heading";
export { IconButton, type IconButtonProps } from "./primitives/icon-button";
export { IconTile, type IconTileProps } from "./primitives/icon-tile";
export { LogoMark } from "./primitives/logo-mark";
export { Panel, type PanelProps } from "./primitives/panel";
export { Select, type SelectProps } from "./primitives/select";
export { Skeleton, SkeletonGroup, TitleCardSkeleton, HeroSkeleton } from "./primitives/skeleton";
export { Spinner } from "./primitives/spinner";
export { Switch, type SwitchProps } from "./primitives/switch";
export { TextLink, textLinkClasses, type TextLinkProps } from "./primitives/text-link";
export { ToggleChip, type ToggleChipProps } from "./primitives/toggle-chip";

// Patterns
export { CarouselControls, type CarouselControlsProps } from "./patterns/carousel-controls";
export { CarouselDots, type CarouselDotsProps } from "./patterns/carousel-dots";
export { EmptyState, type EmptyStateProps } from "./patterns/empty-state";
export { LinkCard, type LinkCardProps } from "./patterns/link-card";
export { NavLink, type NavLinkProps } from "./patterns/nav-link";
export { RatingBadge } from "./patterns/rating-badge";
export { Readout } from "./patterns/readout";
export { ReduceEffectsToggle, ReduceEffectsControl, useReduceEffects } from "./patterns/reduce-effects-toggle";
export { Score, type ScoreProps } from "./patterns/score";
export { SearchField, type SearchFieldProps } from "./patterns/search-field";
export { SectionHeader, type SectionHeaderProps } from "./patterns/section-header";
export { SegmentedControl, type SegmentedControlProps } from "./patterns/segmented-control";
export { SettingRow, type SettingRowProps } from "./patterns/setting-row";
export { ThemeToggle } from "./patterns/theme-toggle";

// Sections
export { CreditsPanel, type CreditsPanelProps } from "./sections/credits-panel";
export { EpisodeList, type EpisodeListProps } from "./sections/episode-list";
export { FilterBar, type FilterBarProps, type ContentTypeFilter, type TierFilter, type SortOption } from "./sections/filter-bar";
export { Footer } from "./sections/footer";
export { GenreBanner } from "./sections/genre-banner";
export { GenreSpotlight } from "./sections/genre-spotlight";
export { Header } from "./sections/header";
export { Hero } from "./sections/hero";
export { Nav } from "./sections/nav";
export { PreferencesPanel, type Preferences } from "./sections/preferences-panel";
export { ProfileCard, type ProfileCardUser } from "./sections/profile-card";
export { PromoBlock } from "./sections/promo-block";
export { Rail } from "./sections/rail";
export { SetupStepList } from "./sections/setup-step-list";
export { TitleCard } from "./sections/title-card";
export { TitleDetailHeader, type TitleDetailHeaderProps } from "./sections/title-detail-header";
export { TitleFactsPanel } from "./sections/title-facts-panel";
export { TitleGrid, type TitleGridProps } from "./sections/title-grid";
export { VideoPlayer } from "./sections/video-player";

// Templates
export { DetailTemplate, type DetailTemplateProps } from "./templates/detail-template";
export { ModularPageTemplate, type ModularPageTemplateProps } from "./templates/modular-page-template";
export { PageShell, type PageShellProps } from "./templates/page-shell";
