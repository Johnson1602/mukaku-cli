import { describe, expect, it } from "vitest";

import { buildApiUrl } from "./http.js";

describe("buildApiUrl", () => {
  it("adds Mukaku's public client params to API URLs", () => {
    const url = buildApiUrl("/prod/api/v1/getVideoList", {
      limit: 24,
      page: 1,
    });

    expect(url.searchParams.get("app_id")).toBe("83768d9ad4");
    expect(url.searchParams.get("identity")).toBe(
      "23734adac0301bccdcb107c4aa21f96c",
    );
  });
});
