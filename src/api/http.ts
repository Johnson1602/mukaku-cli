import { MUKAKU_BASE_URL } from "../constants.js";

interface MukakuClientParams {
  appId: string;
  identity: string;
}

// Public request identifiers used by Mukaku's web client, not private credentials.
const DEFAULT_MUKAKU_CLIENT_PARAMS: MukakuClientParams = {
  appId: "83768d9ad4",
  identity: "23734adac0301bccdcb107c4aa21f96c",
};

export function buildApiUrl(
  pathname: string,
  params: Record<string, string | number>,
): URL {
  const url = new URL(pathname, MUKAKU_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  url.searchParams.set("app_id", DEFAULT_MUKAKU_CLIENT_PARAMS.appId);
  url.searchParams.set("identity", DEFAULT_MUKAKU_CLIENT_PARAMS.identity);

  return url;
}

export async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mukaku request failed: HTTP ${response.status}`);
  }

  return response.json();
}
