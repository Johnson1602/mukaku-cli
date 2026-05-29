import { buildApiUrl, fetchJson } from "./http.js";
import { normalizeVideoDetail } from "../normalize.js";
import { videoDetailResponseSchema, type MukakuVideoDetail } from "../types.js";

interface VideoDetailParams {
  doubanId: number;
}

export async function fetchRawVideoDetailResponse(
  params: VideoDetailParams,
): Promise<unknown> {
  return fetchJson(
    buildApiUrl("/prod/api/v1/getVideoDetail", {
      id: params.doubanId,
    }),
  );
}

export async function getVideoDetail(
  params: VideoDetailParams,
): Promise<MukakuVideoDetail> {
  const rawResponse = await fetchRawVideoDetailResponse(params);
  const parsed = videoDetailResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    throw new Error(`Mukaku response shape changed: ${parsed.error.message}`);
  }

  if (!parsed.data.success) {
    throw new Error(parsed.data.message ?? "Mukaku detail request failed");
  }

  const data = parsed.data.data;
  if (!data) {
    throw new Error("Mukaku detail response is missing data");
  }

  return normalizeVideoDetail(data);
}
