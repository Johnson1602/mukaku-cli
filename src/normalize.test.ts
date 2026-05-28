import { describe, expect, it } from "vitest";
import { normalizeSearchItem } from "./normalize.js";

describe("normalizeSearchItem", () => {
  it("turns a raw Mukaku item into a stable search result", () => {
    const result = normalizeSearchItem({
      type: 1,
      title: "阿凡达",
      otitle: "Avatar",
      doub_id: 1652587,
      doub_score: "8.8",
      IMDB_number: "tt0499549",
      IMDB_score: "7.9",
      years: "2009",
      class: "动作,科幻,冒险",
      production_area: "美国",
      definition: "1080P蓝光,WEB-4K,4K蓝光",
      zqxd: "4K蓝光",
      ejs: "",
      seed_updated_at: "2026-03-26 19:12:22",
    });

    expect(result).toEqual({
      title: "阿凡达",
      originalTitle: "Avatar",
      year: 2009,
      type: "movie",
      doubanId: 1652587,
      doubanUrl: "https://movie.douban.com/subject/1652587/",
      doubanScore: 8.8,
      imdbId: "tt0499549",
      imdbScore: 7.9,
      quality: "4K蓝光",
      episodeStatus: undefined,
      categories: ["动作", "科幻", "冒险"],
      productionArea: "美国",
      definitions: ["1080P蓝光", "WEB-4K", "4K蓝光"],
      seedUpdatedAt: "2026-03-26 19:12:22",
      image: undefined,
      detailUrl: "https://web5.mukaku.com/mv/1652587",
    });
  });
});
