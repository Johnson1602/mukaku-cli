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
  title: string;
  originalTitle?: string;
  year?: number;
  type: MukakuMediaType;
  doubanId?: number;
  doubanUrl?: string;
  doubanScore?: number;
  imdbId?: string;
  imdbScore?: number;
  quality?: string;
  episodeStatus?: string;
  categories: string[];
  productionArea?: string;
  definitions: string[];
  seedUpdatedAt?: string;
  image?: string;
  detailUrl?: string;
}

interface MukakuResourceSummary {
  doubanId: number;
  mukakuId?: number;
  title: string;
  originalTitle?: string;
  year?: number;
  type: MukakuMediaType;
  totalCount: number;
  availableQualities: string[];
  resources: TorrentResource[];
}

export interface MukakuVideoDetail extends MukakuResourceSummary {
  resourcesByQuality: Record<string, TorrentResource[]>;
}

export interface ResourcesResult extends MukakuResourceSummary {
  matchingCount: number;
  returnedCount: number;
  filters: ResourcesFilters;
}

export interface TorrentResource {
  id?: number;
  name: string;
  quality: string;
  size?: string;
  sizeBytes?: number;
  magnetUrl?: string;
  torrentDownloadUrl?: string;
  publishedAt?: string;
  isNew: boolean;
}

export interface ResourcesFilters {
  quality?: string;
  limit?: number;
}
