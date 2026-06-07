import { normalizeSearchItems } from "../normalize.js";
import {
  searchResponseSchema,
  type MukakuSearchItem,
} from "../types.js";
import type { ObjectValues } from "../type-utils.js";
import { buildApiUrl, fetchJson } from "./http.js";

export const FEATURED_CATEGORIES = {
  MOVIES: "movies",
  TV: "tv",
  RECENT: "recent",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
} as const;

export type FeaturedCategory = ObjectValues<typeof FEATURED_CATEGORIES>;

const FEATURED_CATEGORY_CODES: Record<FeaturedCategory, number> = {
  [FEATURED_CATEGORIES.MOVIES]: 1,
  [FEATURED_CATEGORIES.TV]: 2,
  [FEATURED_CATEGORIES.RECENT]: 3,
  [FEATURED_CATEGORIES.WEEKLY]: 4,
  [FEATURED_CATEGORIES.MONTHLY]: 5,
};

export async function fetchRawFeaturedResponse(
  category: FeaturedCategory,
): Promise<unknown> {
  return fetchJson(
    buildApiUrl("/prod/api/v1/getVideoList", {
      sc: FEATURED_CATEGORY_CODES[category],
    }),
  );
}

export async function getFeaturedItems(
  category: FeaturedCategory,
): Promise<MukakuSearchItem[]> {
  const rawResponse = await fetchRawFeaturedResponse(category);
  const parsed = searchResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new Error(`Mukaku response shape changed: ${parsed.error.message}`);
  }

  if (!parsed.data.success) {
    throw new Error(parsed.data.message ?? "Mukaku featured request failed");
  }

  const data = parsed.data.data;
  if (!data) {
    throw new Error("Mukaku featured response is missing data");
  }

  return normalizeSearchItems(data.data);
}
