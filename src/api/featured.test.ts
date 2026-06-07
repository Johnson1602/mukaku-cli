import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRawFeaturedResponse,
  getFeaturedItems,
  type FeaturedCategory,
} from "./featured.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRawFeaturedResponse", () => {
  it.each([
    ["movies", "1"],
    ["tv", "2"],
    ["recent", "3"],
    ["weekly", "4"],
    ["monthly", "5"],
  ] satisfies [FeaturedCategory, string][])(
    "maps %s to sc=%s",
    async (category, expectedCode) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [],
            },
          }),
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      await fetchRawFeaturedResponse(category);

      const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
      expect(requestedUrl.searchParams.get("sc")).toBe(expectedCode);
    },
  );
});

describe("getFeaturedItems", () => {
  it("normalizes items while preserving upstream order", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              data: [
                {
                  title: "First",
                  type: 2,
                  doub_id: 2,
                },
                {
                  title: "Second",
                  type: 1,
                  doub_id: 1,
                },
              ],
              hosts_data: [],
              log: [],
            },
          }),
        ),
      ),
    );

    const result = await getFeaturedItems("recent");

    expect(result.map((item) => item.title)).toEqual(["First", "Second"]);
    expect(result.map((item) => item.type)).toEqual(["tv", "movie"]);
  });

  it("surfaces Mukaku failure messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "接口鉴权异常",
            code: 10000,
          }),
        ),
      ),
    );

    await expect(getFeaturedItems("weekly")).rejects.toThrow("接口鉴权异常");
  });
});
