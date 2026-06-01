# Resource Analysis V1 Plan

## Goal

Add a best-effort `analysis` object to normalized torrent resources. The object should extract high-confidence, agent-useful facts from Mukaku resource titles without replacing the original raw title.

This analysis layer is the foundation for later work:

- cleaner human `resources` output,
- top-pick/recommendation behavior,
- future direct-download selection by agents,
- daily automation over newly released Mukaku items.

## Evidence

This contract is based on the resource-title evidence collected on 2026-05-31:

- `/private/tmp/mukaku-resource-title-analysis-2026-05-31.md`
- `/private/tmp/mukaku-tv-resource-title-analysis-2026-05-31.md`
- `/private/tmp/mukaku-resources-pages-1-3-2026-05-31.json`
- `/private/tmp/mukaku-tv-resources-pages-1-3-2026-05-31.json`

The sample covered:

- 75 movie titles and 704 movie resource rows.
- 75 TV shows and 1,360 TV resource rows.

## Contract Decisions

- Use field name `analysis`.
- Omit unknown fields.
- Omit `analysis` entirely when no fields are detected.
- Keep the full raw resource title in the existing top-level `name` field.
- Keep Mukaku's existing top-level `quality` field separate from `analysis`.
- Do not include raw matched tokens in normal output.
- Treat parsed fields as best-effort, conservative title interpretation.

## V1 Types

```ts
interface EpisodeRange {
  start: number;
  end: number;
}

interface TorrentResourceAnalysis {
  resolution?: string;
  source?: string;
  webProvider?: string;
  videoCodec?: string;
  releaseGroup?: string;
  season?: number;
  episodeRange?: EpisodeRange;
  isCompleteSeason?: boolean;
  frameRate?: number;
  isHighBitrate?: boolean;
  hdrFormats?: string[];
  audioFormats?: string[];
  subtitleLanguages?: string[];
}
```

## Field Semantics

### `resolution`

Use normalized technical values:

- `2160p`
- `1080p`
- `720p`

Do not add a separate `resolutionLabel` field in v1. Human output can map `2160p` to `4K` later if needed.

### `source`

Use a single most-specific normalized phrase:

- `WEB-DL`
- `WEBRip`
- `BluRay`
- `BluRay REMUX`
- `UHD BluRay`
- `UHD BluRay REMUX`

Examples:

- `2160p.DSNP.WEB-DL...` => `source: "WEB-DL"`
- `2025.USA.A24.BluRay.REMUX.UHD.DoVi...` => `source: "UHD BluRay REMUX"`

Do not add `discType` or `isRemux` in v1.

### `webProvider`

Use canonical short provider codes where possible:

- `NF`
- `AMZN`
- `DSNP`
- `ATVP`
- `Baha`
- `CR`
- `iTunes`
- `HamiVideo`
- `Hulu`
- `MAX`

Normalize known variants:

- `Apple.TV+` => `ATVP`
- `iT` => `iTunes`

Keep provider separate from `source`; for example `NF WEB-DL` should become:

```json
{
  "source": "WEB-DL",
  "webProvider": "NF"
}
```

### `videoCodec`

Normalize codec aliases into codec-family values:

- `H265`, `H.265`, `x265`, `HEVC` => `H.265/HEVC`
- `H264`, `H.264`, `x264`, `AVC` => `H.264/AVC`
- `AV1` => `AV1`

### `releaseGroup`

Keep only the clean group name.

Detection rule:

1. Prefer a known release-group list from observed data.
2. If no known group matches, fall back to conservative end-suffix parsing.
3. Only parse suffix-style groups at the end of a title.
4. Do not include uncertainty markers such as `(?)` in JSON values.

Known initial groups should include at least:

- `ALT`
- `BATWEB`
- `DreamHD`
- `PandaQT`
- `QuickIO`
- `BlackTV`
- `DeePTV`
- `ZeroTV`
- `ColorTV`
- `ColorWEB`
- `ParkHD`
- `ParkTV`
- `CTRLHD`
- `CTRLTV`
- `SSDSSE`
- `MiniTV`
- `MiniHD`
- `SONYHD`
- `MOMOWEB`
- `CatWEB`
- `DEFiNiTE`
- `FGT`
- `GPTHD`
- `IAMABLE`
- `RARBG`
- `TERMiNAL`
- `WiKi`

Examples:

- `...H265.HDR.DDP5.1.Atmos-QuickIO` => `releaseGroup: "QuickIO"`
- `...WEB-DL.H264.AAC-BlackTV` => `releaseGroup: "BlackTV"`

Avoid parsing mid-title hyphens as release groups.

### `season`

Use a number from standard `Sxx` release tokens:

- `S00` => `0`
- `S01` => `1`
- `S02` => `2`
- `S14` => `14`

Do not parse localized season labels such as `第一季` / `第二季` in v1. The technical release token is more reliable and avoids inferring season from display titles. Omit `Part 2` in v1.

### `episodeRange`

Use numeric `{ start, end }`.

Rules:

- `第08集` => `{ "start": 8, "end": 8 }`
- `第8集` => `{ "start": 8, "end": 8 }`
- `第01-02集` => `{ "start": 1, "end": 2 }`
- `第1-2集` => `{ "start": 1, "end": 2 }`
- `第125-176集` => `{ "start": 125, "end": 176 }`
- `全10集` => `{ "start": 1, "end": 10 }`

Leading zeros are formatting only and should not be preserved.

### `isCompleteSeason`

Use `true` only when the title explicitly claims complete-season coverage, such as:

- `全集`
- `全10集`
- `全12集`

Omit the field otherwise.

Do not infer completeness from `episodeRange` alone. `{ start: 1, end: 12 }` is not enough unless the title explicitly says it is complete.

### `frameRate`

Use a number:

- `50fps` / `50帧率版本` => `50`
- `60fps` / `60帧率版本` => `60`
- `120fps` / `120帧率版本` => `120`

Prefer technical `fps` tokens outside bracket labels. Use bracket labels such as `[60帧率版本]` only as fallback when no technical `fps` token is present.

Omit when absent.

### `isHighBitrate`

Use `true` for high-bitrate markers:

- `高码版`
- `HQ`

Omit when absent.

Do not fold this into `source`; `HQ WEB-DL` is still `WEB-DL`.

### `hdrFormats`

Use canonical display names in one array:

- `Dolby Vision`
- `HDR`
- `HDR10`
- `HDR10+`

Normalize variants:

- `DV`, `DoVi`, `杜比视界`, `杜比视界版本` => `Dolby Vision`
- `HDR10plus` => `HDR10+`

For technical HDR fields, prefer dot-delimited release-string tokens outside bracket labels. Bracket labels such as `[HDR+杜比视界双版本]` are fallback hints only. If the release string contains `.DoVi.HDR10.`, output `["Dolby Vision", "HDR10"]` rather than adding generic `HDR` from the bracket label.

If a title says `HDR+杜比视界双版本`, include both:

```json
{
  "hdrFormats": ["HDR", "Dolby Vision"]
}
```

Keep `HDR` only when the title says generic `HDR` and no more specific format is confidently implied.

### `audioFormats`

Include audio technical format/capability tokens:

- `AAC`
- `DD`
- `DDP`
- `Atmos`
- `TrueHD`
- `DTS`
- `DTS-HD`
- `FLAC`

`Atmos` may appear in `audioFormats` even though it is technically a surround feature layered on top of another codec. For v1, this is acceptable because it is a useful selection signal and avoids an extra `audioFeatures` field.

Do not include `audioLanguages` in v1.

### `subtitleLanguages`

Use compact language/script codes:

- `中文字幕` / `中字` => `["zh"]`
- `简中` => `["zh-Hans"]`
- `繁中` / `繁体字幕` => `["zh-Hant"]`
- `简繁字幕` => `["zh-Hans", "zh-Hant"]`
- `英字` / `英文字幕` => `["en"]`
- `简繁英字幕` => `["zh-Hans", "zh-Hant", "en"]`
- `繁英字幕` => `["zh-Hant", "en"]`
- `无字片源` => `["none"]`

Do not add `subtitleFormats` in v1.

## Deferred Fields

Do not include these in v1:

- `audioLanguages`
- `subtitleFormats`
- `discType`
- `container`
- generic `edition`
- raw matched token list
- field-level confidence
- `releaseGroupSource`
- `audioFeatures`

Rationale:

- `audioLanguages` is less important for the user's immediate analysis needs.
- `subtitleFormats` needs more evidence and clearer semantics.
- `discType` and remux information are already carried by the most-specific `source` value.
- `container` had no useful evidence in the current report.
- Generic `edition` risks becoming an untyped dumping ground.
- Raw tokens and confidence metadata can be added later behind debug output or a separate metadata object if false positives become a real issue.

## Example

Input title:

```text
全集 安多.第二季[HDR+杜比视界双版本][全12集][简繁英字幕].2025.2160p.DSNP.WEB-DL.DDP5.1.Atmos.H265.HDR.DV-MiniTV
```

Expected analysis:

```json
{
  "resolution": "2160p",
  "source": "WEB-DL",
  "webProvider": "DSNP",
  "videoCodec": "H.265/HEVC",
  "releaseGroup": "MiniTV",
  "season": 2,
  "episodeRange": {
    "start": 1,
    "end": 12
  },
  "isCompleteSeason": true,
  "hdrFormats": ["HDR", "Dolby Vision"],
  "audioFormats": ["DDP", "Atmos"],
  "subtitleLanguages": ["zh-Hans", "zh-Hant", "en"]
}
```

## Implementation Notes

- Prefer a dedicated parser/helper module rather than burying this logic inside command code.
- Keep parser output additive; do not remove or rewrite the existing `name`.
- Add focused tests with real sampled title strings from the evidence files.
- Keep detection conservative. Missing a field is better than returning a confidently wrong value.
