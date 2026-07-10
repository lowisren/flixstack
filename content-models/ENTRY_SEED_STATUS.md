# Contentstack dummy-data entry seeding — complete (minus images)

All entries from `src/lib/mock-data.ts` are now live in the stack as **draft entries** (nothing
published to any environment). Verified counts via `mcp__contentstack__get_all_entries`:

| Content type | Count |
|---|---|
| `genre` | 6 |
| `person` | 15 |
| `episode` | 18 |
| `movie` | 20 |
| `tv_series` | 3 (each with 2 `seasons` modular blocks, 3 `episode` references each) |
| `hero_banner` | 3 |
| `homepage_rail` | 5 |

## What's NOT done: image fields

Every `file`-type field (`hero_image`, `thumbnail`, `photo`, `background_image`) was **left empty**
on every entry, per explicit user decision — they'll add real images later. This was necessary
regardless: the Contentstack MCP server has no asset-upload/create tool (confirmed by searching the
full deferred tool list — only asset *management* tools exist: metadata, publish, versioning,
folders; nothing creates a new asset from a URL or file).

If a future session gets an asset-upload tool and wants to backfill images:
- Source URLs are the Picsum placeholders in `src/lib/mock-data.ts` (`img()` / `portrait()` helpers).
- Each entry's `uid` is recorded in the stack; match by `slug` (movies/tv_series/genres/people all
  have one) or `title` to find the right entry, then `update_an_entry` to set the file field once
  the asset exists.

## Reference-field format used (for future entry-creation work in this stack)

Contentstack CMA reference fields — confirmed live — are arrays of
`{ "uid": "<entry_uid>", "_content_type_uid": "<content_type>" }`, even for fields with
`"multiple": false` (single-reference fields like `director`/`creator` still take a
one-element array). This is more explicit than `scripts/seed.ts`'s bare `{uid: ...}` format
(untested against the real API) — include `_content_type_uid` always, it's required for fields
that can reference more than one content type (`linked_title`, `homepage_rail.items`).

Modular blocks (`tv_series.seasons`) take the form:
```json
"seasons": [{ "season_block": { "season_number": 1, "release_date": "...", "episodes": [...] } }]
```
The API auto-adds a `_metadata.uid` per block instance on creation.

## Stack state

Confirmed via `get_all_entries` with `include_count: true` on each content type — no publish calls
were made, so nothing is live in any environment yet. Review and publish from the Contentstack UI
when ready.
