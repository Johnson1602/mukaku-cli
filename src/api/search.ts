import { buildApiUrl, fetchJson } from "./http.js";
import { normalizeSearchItems } from "../normalize.js";
import { searchResponseSchema, type MukakuSearchItem } from "../types.js";

interface SearchParams {
  query: string;
  page: number;
  limit: number;
}

export async function fetchRawSearchResponse(params: SearchParams): Promise<unknown> {
  return fetchJson(
    buildApiUrl("/prod/api/v1/getVideoList", {
      sb: params.query,
      page: params.page,
      limit: params.limit,
    }),
  );
}

export async function searchMukaku(params: SearchParams): Promise<MukakuSearchItem[]> {
  const rawResponse = await fetchRawSearchResponse(params);
  const parsed = searchResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new Error(`Mukaku response shape changed: ${parsed.error.message}`);
  }

  if (!parsed.data.success) {
    throw new Error(parsed.data.message ?? "Mukaku search failed");
  }

  const data = parsed.data.data;
  if (!data) {
    throw new Error("Mukaku search response is missing data");
  }

  return normalizeSearchItems(data.data);
}
