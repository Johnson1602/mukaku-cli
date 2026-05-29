import { MUKAKU_BASE_URL } from "../constants.js";

const APP_ID = "83768d9ad4";
const IDENTITY = "23734adac0301bccdcb107c4aa21f96c";

export function buildApiUrl(
  pathname: string,
  params: Record<string, string | number>,
): URL {
  const url = new URL(pathname, MUKAKU_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("identity", IDENTITY);

  return url;
}

export async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mukaku request failed: HTTP ${response.status}`);
  }

  return response.json();
}
