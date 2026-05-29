# Resources Command Plan

## Goal

Add a `mukaku resources <douban-id>` command that fetches Mukaku detail-page data and prints normalized torrent resources.

This command intentionally skips the broader `detail` command for now. The detail endpoint already contains the resource data we need, and the main user value is listing torrent resources.

## Handoff Notes

- This is a plan only. No implementation files have been changed yet, except this plan file.
- `AGENTS.md` has already been updated with the new `src/api/` convention.
- The current repo has only the search MVP implemented.
- Current API code is in `src/client.ts`; the implementation should move that code into `src/api/search.ts` and remove `src/client.ts`.
- The current search normalization builds `detailUrl` from `doub_id`, which matches the site's search-result click behavior.
- The live site behavior was checked against `https://web5.mukaku.com/mv/35517044` and `https://web5.mukaku.com/mv/35010610`.
- Do not implement cloud-drive output in this pass.
- Do not implement the separate `detail` command in this pass.
- Do not update `guides/building-mukaku-cli-search-mvp.md` in this pass.
- After implementation, run `pnpm test`, `pnpm typecheck`, and `pnpm build`.

## Decisions

- Create `src/api/` for Mukaku endpoint clients.
- `AGENTS.md` already says endpoint clients belong in `src/api/`, while shared normalization, output, and type modules stay flat under `src/`.
- Delete `src/client.ts` and move existing search API code into `src/api/search.ts`.
- Add `src/api/http.ts` for shared URL construction and JSON fetching only.
- Add `src/api/video-detail.ts` for `getVideoDetail`.
- Keep Zod schemas, inferred raw response types, and normalized interfaces in flat `src/types.ts`.
- Keep normalization functions in flat `src/normalize.ts`.
- Keep human output formatters in flat `src/output.ts`.
- Add shared CLI option parsers in `src/options.ts`.
- Do not update `guides/building-mukaku-cli-search-mvp.md` as part of this work.

## API Model

The site's search result click path uses `doub_id`:

```text
/mv/<doub_id>
```

The detail page then calls:

```text
GET /prod/api/v1/getVideoDetail?id=<route-param>
```

API requests also need the shared query params:

```text
app_id=83768d9ad4
identity=23734adac0301bccdcb107c4aa21f96c
```

For normalized CLI types:

- `doubanId` is the public user-facing id used in `/mv/:id` and by `resources <douban-id>`.
- `mukakuId` is the internal Mukaku database id from raw `data.id`.
- `idcode` is omitted from normalized public types for now because the search-to-detail path does not use it.

## Command Contract

```bash
mukaku resources <douban-id>
mukaku resources <douban-id> --quality WEB-4K
mukaku resources <douban-id> --limit 10
mukaku resources <douban-id> --json
mukaku resources <douban-id> --raw
```

### Arguments

- `<douban-id>` must be a positive integer.
- The same command supports movies and TV shows.

### Options

- `--quality <quality>` filters by exact `ecca` group key.
- `--limit <number>` narrows the number of returned resources.
- `--json` prints the normalized result envelope.
- `--raw` prints the untouched `getVideoDetail` response.

Do not support `--limit all`; omitting `--limit` already returns all resources.

### Mutually Exclusive Options

`--raw` must not be combined with processing or output modifiers:

- `--json`
- `--quality`
- `--limit`

If combined, fail before printing data.

## Resource Semantics

Only torrent resources are in scope for v1.

Cloud-drive resources from `movies_online_seed` are intentionally ignored for now. If added later, use names like `CloudDriveResource`, not "web disk".

Use `ecca` as the canonical torrent source:

- `ecca` preserves quality groups.
- `all_seeds` duplicates the same resources as a globally recency-sorted flat list.
- Derive flat output by flattening `ecca` and sorting by `publishedAt` descending.
- For same-date resources, preserve derived order.

If `--quality` is unknown, fail with available quality names.

## Normalized Types

```ts
interface TorrentResource {
  id?: number;
  name: string;
  quality: string;
  qualityGroup: string;
  size?: string;
  sizeBytes?: number;
  magnetUrl?: string;
  torrentDownloadUrl?: string;
  publishedAt?: string;
  isNew: boolean;
}

interface ResourcesResult {
  doubanId: number;
  mukakuId?: number;
  title: string;
  originalTitle?: string;
  year?: number;
  type: "movie" | "tv" | "unknown";
  totalCount: number;
  matchingCount: number;
  returnedCount: number;
  filters: {
    quality?: string;
    limit?: number;
  };
  availableQualities: string[];
  resources: TorrentResource[];
}
```

Notes:

- `magnetUrl` is optional.
- `torrentDownloadUrl` is optional and should be absolute when present.
- `size` keeps upstream display text.
- `sizeBytes` is parsed from `size` for scripts and future sorting.

## Output Behavior

Human and JSON modes must represent the same dataset for the same flags. `--json` only changes representation.

No default limit:

- Omit `--limit`: return all matching resources.
- `--limit 10`: return first 10 matching resources.

Human output:

- Always show title/year context.
- Always show count heading.
- Show filtered count and global count when filters are applied.
- Show full resource names.
- Omit magnet and torrent download URLs from human output.
- Use minimal resource rows.

Example:

```text
低智商犯罪 (2026)
66 torrent resources

1. [杜比视界] 全集 低智商犯罪[杜比视界版本][全24集][国语音轨+简繁英字幕]...
   90.4 GB · 2026-05-22 · NEW
```

With quality:

```text
低智商犯罪 (2026)
32 matching torrent resources (66 total)
Quality: WEB-4K
```

With quality and limit:

```text
低智商犯罪 (2026)
Showing 10 of 32 matching torrent resources (66 total)
Quality: WEB-4K
```

JSON output:

- Return a `ResourcesResult` object, not a bare array.
- Include URLs in `resources`.
- Include counts, filters, and available qualities.

## Validation

Use strict-ish Zod validation:

- Validate response envelope.
- Validate detail fields needed by `ResourcesResult`.
- Validate `ecca` and torrent fields used by normalization.
- Allow passthrough or optional fields for the rest of the large detail payload.

## Tests

Expand `src/normalize.test.ts` with focused cases:

- normalizes `ecca` into `TorrentResource` items.
- derives `ResourcesResult` metadata from raw detail data.
- uses `doubanId` from `doub_id` and `mukakuId` from raw `id`.
- parses `sizeBytes` from `zsize`.
- converts relative `down` paths to absolute `torrentDownloadUrl`.
- keeps partial resources with missing `id` or `magnetUrl`.
- filters by exact quality.
- fails unknown quality with available qualities.
- applies numeric limit.
- keeps no-limit behavior as "all".
- produces counts: `totalCount`, `matchingCount`, `returnedCount`.

## Implementation Checklist

1. Add `src/api/http.ts`.
2. Move search endpoint code from `src/client.ts` to `src/api/search.ts`.
3. Update `src/commands/search.ts` imports.
4. Delete `src/client.ts`.
5. Add detail/torrent raw schemas and normalized interfaces to `src/types.ts`.
6. Add `src/api/video-detail.ts`.
7. Add shared positive integer parser to `src/options.ts`.
8. Add resource normalization and result-building helpers to `src/normalize.ts`.
9. Add resource human formatter to `src/output.ts`.
10. Add `src/commands/resources.ts`.
11. Register resources command in `src/index.ts`.
12. Expand `src/normalize.test.ts`.
13. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
