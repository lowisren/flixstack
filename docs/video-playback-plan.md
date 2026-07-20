# Video playback for /watch/[slug]

## Context

The `/watch/[slug]` detail page ([src/app/watch/[slug]/page.tsx](../src/app/watch/[slug]/page.tsx))
renders a title's hero, synopsis, cast, and — for series — an episode list, but there is **no way to
actually play anything**:

- The "Play Movie" / "Play Episode 1" hero buttons and the per-episode hover play icons are dead
  markup — they have no handlers.
- There is **no video player component** anywhere in the app.
- The `movie` content type has only a `trailer_url` (a YouTube link, used nowhere), and neither
  `tv_series` nor `episode` has any playable video source at all.

**Goal:** give movies and episodes a real, editor-managed video source in Contentstack and play it
inline on the watch page. Series playback is driven entirely per-episode.

### Confirmed decisions

1. **Video source:** a reusable **`playback` global field** carrying both an external URL *and* a
   file-asset fallback (so an editor can either paste a hosted URL or upload the file manually),
   plus an optional poster and caption tracks.
2. **Player tech:** native HTML5 `<video>` (no new runtime dependency). Plays MP4 everywhere and
   HLS natively on Safari.
3. **Playback UX:** the player renders **inline, replacing the hero** on the same page. Selecting a
   series episode loads that episode into the same player.
4. **Rollout:** update `content-models/export.json` (the source of truth) **and** ship an
   idempotent CMA script — but **do not** apply the changes to the live stack here. The user runs
   the script when ready.
5. **Captions and poster** are kept in the global field.

**Key architectural lever:** [normalize.ts](../src/lib/contentstack/normalize.ts) is the single
mapping layer between raw Delivery-API entries and the app's flat types in
[types.ts](../src/lib/types.ts). The new `playback` global field is absorbed there, keeping the
app-facing types flat.

## 1. Contentstack model changes

### New global field: `playback`

| Field | UID | Type | Notes |
|---|---|---|---|
| Video URL | `video_url` | text | Primary source — HLS `.m3u8` or `.mp4`. |
| Video File | `video_file` | file | Manual-upload fallback when no hosted URL exists. |
| Poster | `poster` | file | Optional still shown before playback. |
| Captions | `captions` | group (multiple) | Optional `<track>` list. |
| ↳ Label | `captions.label` | text | e.g. "English". |
| ↳ Language | `captions.srclang` | text | BCP-47 code, e.g. "en". |
| ↳ File | `captions.vtt_file` | file | A `.vtt` caption file. |

The player prefers `video_url`; if absent it falls back to `video_file`. A title is "playable" when
either is set.

### Attach `playback` to

- **`movie`** — the movie's playable source (inserted before the `title_metadata` global field).
- **`episode`** — each episode's playable source.

`tv_series` gains **no** video field — series playback comes entirely from `episode.playback`.
`movie.trailer_url` is left untouched (it is a separate concept from the main feature).

### How it ships

- **`content-models/export.json`** — add the `playback` global field definition and the new field on
  the `movie` and `episode` content-type schemas.
- **`scripts/add-playback-field.mjs`** — idempotent CMA script modeled on
  [scripts/migrate-v2.mjs](../scripts/migrate-v2.mjs): creates the `playback` global field (skips if
  it exists) and inserts the field into `movie` and `episode` (skips if already present). Run with
  `node scripts/add-playback-field.mjs` against the configured branch. **Not run automatically.**

## 2. App types + normalization

- **[src/lib/types.ts](../src/lib/types.ts):** add `CaptionTrack` and `Playback` interfaces; add
  optional `playback?: Playback` to `Movie` and `Episode`.
- **[src/lib/contentstack/normalize.ts](../src/lib/contentstack/normalize.ts):** unwrap the
  `playback` global field in `normalizeMovie` and `normalizeEpisode` (map `video_file`, `poster`,
  and the `captions[]` group). Global fields arrive embedded in the entry, so **no query /
  `includeReference` change is needed** — episodes already resolve via
  `seasons.season_block.episodes`.

## 3. VideoPlayer component

New client component `src/components/streaming/video-player.tsx`:

- Native `<video controls poster>` with a `<source>` preferring `video_url`, falling back to
  `video_file.url`.
- A `<track kind="captions">` per caption entry.
- Accessible: keyboard operable, labelled, no auto-playing flash of motion (honours the guidance in
  [docs/accessibility.md](accessibility.md)). Poster falls back to the title's `hero_image` /
  `thumbnail` when none is set on the field.

## 4. Wire up /watch/[slug] (inline, replaces hero)

The page stays a **server component** (data fetch + SEO). A thin client wrapper
`src/app/watch/[slug]/watch-player.tsx` owns the "currently playing source" state:

- **Movie:** the hero Play button plays `movie.playback` inline where the hero image was.
- **TV series:** the hero Play button plays the first playable episode; each episode row's play
  control (currently dead) loads that episode into the same inline player, with a "Now Playing"
  indicator on the active row.
- **Fallbacks:** when nothing is playable, the Play control is disabled with a hint. Premium-tier
  gating is **out of scope** for this change.

## 5. Verification

- `pnpm lint` + `pnpm build` (typecheck) pass.
- Manual: seed a `playback.video_url` (e.g. a public sample MP4) on a movie and on a couple of
  episodes, run `pnpm dev`, and confirm inline play + episode switching + captions on both a movie
  and a TV-show watch page.

## Files touched

| File | Change |
|---|---|
| `docs/video-playback-plan.md` | This plan. |
| `content-models/export.json` | `playback` global field + field on `movie`/`episode`. |
| `scripts/add-playback-field.mjs` | New idempotent CMA script (not auto-run). |
| `src/lib/types.ts` | `Playback` + `CaptionTrack`; `playback?` on `Movie`/`Episode`. |
| `src/lib/contentstack/normalize.ts` | Normalize `playback` for movie + episode. |
| `src/components/streaming/video-player.tsx` | New native HTML5 player. |
| `src/app/watch/[slug]/watch-player.tsx` | New client wrapper for inline playback state. |
| `src/app/watch/[slug]/page.tsx` | Render the wrapper; pass playback data down. |
</content>
</invoke>
