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
  }),
});

export type RawMukakuItem = z.infer<typeof rawMukakuItemSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;

export interface MukakuSearchItem {
  title: string;
  originalTitle?: string;
  year?: number;
  type: "movie" | "tv" | "unknown";
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
