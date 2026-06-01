import { z } from "zod";

export const rawMukakuItemSchema = z.object({
  id: z.number().optional(),
  type: z.number().optional(),
  title: z.string().optional(),
  otitle: z.string().optional(),
  image: z.string().optional(),
  doub_id: z.number().optional(),
  doub_score: z.string().optional(),
  IMDB_number: z.string().optional(),
  IMDB_score: z.string().optional(),
  years: z.string().optional(),
  class: z.string().optional(),
  production_area: z.string().optional(),
  definition: z.string().optional(),
  zqxd: z.string().optional(),
  ejs: z.string().optional(),
  seed_updated_at: z.string().optional(),
});

export const searchResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  code: z.number().optional(),
  data: z.object({
    data: z.array(rawMukakuItemSchema),
  }).optional(),
});

export const rawTorrentResourceSchema = z.object({
  id: z.number().optional(),
  zname: z.string().optional(),
  zsize: z.string().optional(),
  zqxd: z.string().optional(),
  zlink: z.string().optional(),
  down: z.string().optional(),
  ezt: z.string().optional(),
  new: z.union([z.number(), z.boolean()]).optional(),
  definition_group: z.string().optional(),
});

export const rawVideoDetailSchema = z.object({
  id: z.number().optional(),
  type: z.number().optional(),
  title: z.string(),
  otitle: z.string().optional(),
  doub_id: z.number(),
  years: z.string().optional(),
  ecca: z.record(z.string(), z.array(rawTorrentResourceSchema)).optional(),
  all_seeds: z.array(rawTorrentResourceSchema).optional(),
});

export const videoDetailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  code: z.number().optional(),
  data: rawVideoDetailSchema.optional(),
});

export type RawMukakuItem = z.infer<typeof rawMukakuItemSchema>;
export type RawTorrentResource = z.infer<typeof rawTorrentResourceSchema>;
export type RawVideoDetail = z.infer<typeof rawVideoDetailSchema>;
export type MukakuMediaType = "movie" | "tv" | "unknown";

export interface MukakuSearchItem {
  /** Localized title from Mukaku. Example: "阿凡达". */
  title: string;
  /** Original or alternate title when Mukaku provides one. */
  originalTitle?: string;
  /** Release year parsed from Mukaku's year string. */
  year?: number;
  /** Normalized media type derived from Mukaku's numeric type. */
  type: MukakuMediaType;
  /** Douban subject id used by Mukaku detail pages. */
  doubanId?: number;
  /** Public Douban subject URL built from `doubanId`. */
  doubanUrl?: string;
  /** Douban score parsed as a positive number. */
  doubanScore?: number;
  /** IMDB title id when present. Example: "tt0499549". */
  imdbId?: string;
  /** IMDB score parsed as a positive number. */
  imdbScore?: number;
  /** Best or headline Mukaku quality label for the item. Example: "4K蓝光". */
  quality?: string;
  /** TV episode status text from search results. Example: "更新至8集". */
  episodeStatus?: string;
  /** Genre/category labels split from Mukaku's comma-separated field. */
  categories: string[];
  /** Production country or region label from Mukaku. */
  productionArea?: string;
  /** Available definition labels split from Mukaku's comma-separated field. */
  definitions: string[];
  /** Last seed update timestamp as provided by Mukaku. */
  seedUpdatedAt?: string;
  /** Poster or cover image URL from Mukaku. */
  image?: string;
  /** Mukaku detail page URL built from `doubanId`. */
  detailUrl?: string;
}

interface MukakuResourceSummary {
  /** Douban subject id used as the stable public detail identifier. */
  doubanId: number;
  /** Internal Mukaku database id from the detail response. */
  mukakuId?: number;
  /** Localized detail title from Mukaku. */
  title: string;
  /** Original or alternate detail title when Mukaku provides one. */
  originalTitle?: string;
  /** Release year parsed from Mukaku's year string. */
  year?: number;
  /** Normalized media type derived from Mukaku's numeric type. */
  type: MukakuMediaType;
  /** Total torrent resource count before command filters are applied. */
  totalCount: number;
  /** Mukaku quality group names available in the detail response. */
  availableQualities: string[];
  /** Flat list of normalized torrent resources. */
  resources: TorrentResource[];
}

export interface MukakuVideoDetail extends MukakuResourceSummary {
  /** Torrent resources grouped by Mukaku quality group. Example key: "WEB-4K". */
  resourcesByQuality: Record<string, TorrentResource[]>;
}

export interface ResourcesResult extends MukakuResourceSummary {
  /** Number of resources matching the selected filters before limit is applied. */
  matchingCount: number;
  /** Number of resources returned after all filters and limits are applied. */
  returnedCount: number;
  /** Filters used to produce this resources result. */
  filters: ResourcesFilters;
}

export interface TorrentResource {
  /** Mukaku torrent resource id when present. */
  id?: number;
  /** Raw Mukaku resource title. Kept as the audit trail for best-effort analysis. */
  name: string;
  /** Mukaku-provided quality group for this resource. Example: "WEB-4K". */
  quality: string;
  /** Best-effort facts detected from the raw resource title. */
  analysis?: TorrentResourceAnalysis;
  /** Human-readable size from Mukaku. Example: "1.5 GB". */
  size?: string;
  /** Parsed byte size derived from `size` when possible. */
  sizeBytes?: number;
  /** Magnet URL when Mukaku provides one. */
  magnetUrl?: string;
  /** Absolute torrent download URL built from Mukaku's download path. */
  torrentDownloadUrl?: string;
  /** Publish/update date text from Mukaku. */
  publishedAt?: string;
  /** Whether Mukaku marks this resource as new. */
  isNew: boolean;
}

export interface TorrentResourceAnalysis {
  /** Technical resolution token detected from title. Example: "2160p". */
  resolution?: string;
  /** Most-specific source phrase. Example: "UHD BluRay REMUX" or "WEB-DL". */
  source?: string;
  /** Canonical web provider token when known. Example: "NF" or "DSNP". */
  webProvider?: string;
  /** Normalized video codec family. Example: "H.265/HEVC". */
  videoCodec?: string;
  /** Release group detected from the title suffix. Example: "DreamHD". */
  releaseGroup?: string;
  /** Numeric season detected from `Sxx` release tokens. Example: `1` for `S01`. */
  season?: number;
  /** Episode coverage detected from title tokens such as `第01-02集`. */
  episodeRange?: EpisodeRange;
  /** True only when the title explicitly claims complete-season coverage. */
  isCompleteSeason?: boolean;
  /** Frame rate detected from fps or Chinese frame-rate markers. Example: `60`. */
  frameRate?: number;
  /** True when high-bitrate markers such as `高码版` or `HQ` are present. */
  isHighBitrate?: boolean;
  /** HDR formats detected from the title. Example: `["HDR", "Dolby Vision"]`. */
  hdrFormats?: string[];
  /** Audio format/capability tokens. Example: `["DDP", "Atmos"]`. */
  audioFormats?: string[];
  /** Subtitle language/script codes. Example: `["zh-Hans", "zh-Hant", "en"]`. */
  subtitleLanguages?: string[];
}

export interface EpisodeRange {
  /** First episode included in the resource. */
  start: number;
  /** Last episode included in the resource. Same as `start` for single episodes. */
  end: number;
}

export interface ResourcesFilters {
  /** Exact Mukaku quality group filter. Example: "WEB-4K". */
  quality?: string;
  /** Maximum number of resources to return after filtering. */
  limit?: number;
}
