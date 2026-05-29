import { describe, expect, it } from "vitest";
import {
  buildResourcesResult,
  normalizeSearchItem,
} from "./normalize.js";
import type { RawVideoDetail } from "./types.js";

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

const rawDetail: RawVideoDetail = {
  id: 92753,
  type: 2,
  title: "低智商犯罪",
  otitle: "Born with Luck",
  doub_id: 35517044,
  years: "2026",
  ecca: {
    "WEB-4K": [
      {
        id: 3,
        zname: "WEB newer",
        zsize: "1.5 GB",
        zqxd: "WEB-4K",
        zlink: "magnet:?xt=urn:btih:web-newer",
        down: "/prod/api/v1/down?id=3",
        ezt: "2026-05-22",
        new: 1,
        definition_group: "WEB-4K",
      },
      {
        zname: "WEB older partial",
        zsize: "512 MB",
        zqxd: "WEB-4K",
        down: "/prod/api/v1/down?id=2",
        ezt: "2026-05-20",
        new: 0,
        definition_group: "WEB-4K",
      },
    ],
    "杜比视界": [
      {
        id: 1,
        zname: "DV same day",
        zsize: "90.4 GB",
        zqxd: "杜比视界",
        zlink: "magnet:?xt=urn:btih:dv",
        down: "/prod/api/v1/down?id=1",
        ezt: "2026-05-22",
        new: true,
        definition_group: "杜比视界",
      },
    ],
  },
  all_seeds: [
    {
      id: 1,
      zname: "DV same day",
      zsize: "90.4 GB",
      zqxd: "杜比视界",
      zlink: "magnet:?xt=urn:btih:dv",
      down: "/prod/api/v1/down?id=1",
      ezt: "2026-05-22",
      new: true,
      definition_group: "杜比视界",
    },
    {
      zname: "WEB older partial",
      zsize: "512 MB",
      zqxd: "WEB-4K",
      down: "/prod/api/v1/down?id=2",
      ezt: "2026-05-20",
      new: 0,
      definition_group: "WEB-4K",
    },
    {
      id: 3,
      zname: "WEB newer",
      zsize: "1.5 GB",
      zqxd: "WEB-4K",
      zlink: "magnet:?xt=urn:btih:web-newer",
      down: "/prod/api/v1/down?id=3",
      ezt: "2026-05-22",
      new: 1,
      definition_group: "WEB-4K",
    },
  ],
};

describe("buildResourcesResult", () => {
  it("uses all_seeds order for the default resource list", () => {
    const result = buildResourcesResult(rawDetail);

    expect(result.resources).toEqual([
      {
        id: 1,
        name: "DV same day",
        quality: "杜比视界",
        size: "90.4 GB",
        sizeBytes: 97066260890,
        magnetUrl: "magnet:?xt=urn:btih:dv",
        torrentDownloadUrl: "https://web5.mukaku.com/prod/api/v1/down?id=1",
        publishedAt: "2026-05-22",
        isNew: true,
      },
      {
        id: undefined,
        name: "WEB older partial",
        quality: "WEB-4K",
        size: "512 MB",
        sizeBytes: 536870912,
        magnetUrl: undefined,
        torrentDownloadUrl: "https://web5.mukaku.com/prod/api/v1/down?id=2",
        publishedAt: "2026-05-20",
        isNew: false,
      },
      {
        id: 3,
        name: "WEB newer",
        quality: "WEB-4K",
        size: "1.5 GB",
        sizeBytes: 1610612736,
        magnetUrl: "magnet:?xt=urn:btih:web-newer",
        torrentDownloadUrl: "https://web5.mukaku.com/prod/api/v1/down?id=3",
        publishedAt: "2026-05-22",
        isNew: true,
      },
    ]);
  });

  it("derives metadata and counts without a default limit", () => {
    const result = buildResourcesResult(rawDetail);

    expect(result).toMatchObject({
      doubanId: 35517044,
      mukakuId: 92753,
      title: "低智商犯罪",
      originalTitle: "Born with Luck",
      year: 2026,
      type: "tv",
      totalCount: 3,
      matchingCount: 3,
      returnedCount: 3,
      filters: {},
      availableQualities: ["WEB-4K", "杜比视界"],
    });
    expect(result.resources).toHaveLength(3);
  });

  it("filters by exact quality", () => {
    const result = buildResourcesResult(rawDetail, { quality: "WEB-4K" });

    expect(result.totalCount).toBe(3);
    expect(result.matchingCount).toBe(2);
    expect(result.returnedCount).toBe(2);
    expect(result.resources.map((resource) => resource.quality)).toEqual([
      "WEB-4K",
      "WEB-4K",
    ]);
  });

  it("fails unknown quality with available qualities", () => {
    expect(() => buildResourcesResult(rawDetail, { quality: "BluRay" })).toThrow(
      'Unknown quality "BluRay". Available qualities: WEB-4K, 杜比视界',
    );
  });

  it("applies numeric limit after filtering", () => {
    const result = buildResourcesResult(rawDetail, {
      quality: "WEB-4K",
      limit: 1,
    });

    expect(result.totalCount).toBe(3);
    expect(result.matchingCount).toBe(2);
    expect(result.returnedCount).toBe(1);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].name).toBe("WEB newer");
  });
});
