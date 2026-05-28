import { MUKAKU_BASE_URL } from "./constants.js";
import { searchResponseSchema, type SearchResponse } from "./types.js";

const APP_ID = "83768d9ad4";
const IDENTITY = "23734adac0301bccdcb107c4aa21f96c";

export interface SearchParams {
  query: string;
  page: number;
  limit: number;
}

function buildSearchUrl(params: SearchParams) {
  const url = new URL("/prod/api/v1/getVideoList", MUKAKU_BASE_URL);
  url.searchParams.set("sb", params.query);
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("identity", IDENTITY);
  return url;
}

export async function fetchRawSearchResponse(params: SearchParams): Promise<unknown> {
  const response = await fetch(buildSearchUrl(params));

  if (!response.ok) {
    throw new Error(`Mukaku request failed: HTTP ${response.status}`);
  }

  return response.json();
}

export async function searchMukaku(params: SearchParams): Promise<SearchResponse> {
  const rawResponse = await fetchRawSearchResponse(params);
  const parsed = searchResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new Error(`Mukaku response shape changed: ${parsed.error.message}`);
  }

  if (!parsed.data.success) {
    throw new Error(parsed.data.message ?? "Mukaku search failed");
  }

  return parsed.data;
}
