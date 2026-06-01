import { describe, expect, it } from "vitest";
import { formatResourcesResult } from "./output.js";
import type { ResourcesResult } from "./types.js";

describe("formatResourcesResult", () => {
  it("prints compact actionable resource rows without raw titles or download links", () => {
    const result: ResourcesResult = {
      doubanId: 123,
      title: "挽救计划",
      year: 2026,
      type: "movie",
      totalCount: 2,
      matchingCount: 2,
      returnedCount: 2,
      filters: {},
      availableQualities: ["WEB-4K"],
      resources: [
        {
          id: 1,
          name: "挽救计划[国英多音轨+简繁英双语特效字幕].2026.2160p.iTunes.WEB-DL.DDP.5.1.Atmos.HDR10+.H.265.2Audio.V1-DreamHD",
          quality: "WEB-4K",
          analysis: {
            resolution: "2160p",
            source: "WEB-DL",
            webProvider: "iTunes",
            videoCodec: "H.265/HEVC",
            releaseGroup: "DreamHD",
            frameRate: 60,
            isHighBitrate: true,
            hdrFormats: ["HDR10+"],
            audioFormats: ["DDP", "Atmos"],
            subtitleLanguages: ["zh-Hans", "zh-Hant", "en"],
          },
          size: "12.3 GB",
          sizeBytes: 13207024435,
          magnetUrl: "magnet:?xt=urn:btih:with-zh",
          torrentDownloadUrl: "https://web5.mukaku.com/prod/api/v1/down?id=1",
          publishedAt: "2026-05-31",
          isNew: true,
        },
        {
          id: 2,
          name: "No Chinese Subs.2026.1080p.WEB-DL.H264-QuickIO",
          quality: "WEB-1080P",
          analysis: {
            resolution: "1080p",
            source: "WEB-DL",
            videoCodec: "H.264/AVC",
            releaseGroup: "QuickIO",
            season: 1,
            episodeRange: {
              start: 1,
              end: 2,
            },
            subtitleLanguages: ["en"],
          },
          size: "2.1 GB",
          sizeBytes: 2254857830,
          magnetUrl: "magnet:?xt=urn:btih:no-zh",
          torrentDownloadUrl: "https://web5.mukaku.com/prod/api/v1/down?id=2",
          publishedAt: "2026-05-30",
          isNew: false,
        },
      ],
    };

    expect(formatResourcesResult(result)).toBe(`挽救计划 (2026)
2 torrent resources

1. 2160p · 60fps · High bitrate · HDR10+
   WEB-DL · iTunes · H.265/HEVC · DreamHD
   2026-05-31 · 12.3 GB · magnet:?xt=urn:btih:with-zh

2. S01 E1-2 · 1080p · zh unavailable
   WEB-DL · H.264/AVC · QuickIO
   2026-05-30 · 2.1 GB · magnet:?xt=urn:btih:no-zh`);
  });

  it("formats complete season coverage compactly", () => {
    const result: ResourcesResult = {
      doubanId: 35517044,
      title: "低智商犯罪",
      year: 2026,
      type: "tv",
      totalCount: 1,
      matchingCount: 1,
      returnedCount: 1,
      filters: {},
      availableQualities: ["杜比视界"],
      resources: [
        {
          id: 1,
          name: "全集 低智商犯罪[全24集].Born.with.Luck.S01.2026.2160p.WEB-DL.H265.DV.DDP5.1-BlackTV",
          quality: "杜比视界",
          analysis: {
            resolution: "2160p",
            source: "WEB-DL",
            videoCodec: "H.265/HEVC",
            releaseGroup: "BlackTV",
            season: 1,
            episodeRange: {
              start: 1,
              end: 24,
            },
            isCompleteSeason: true,
            hdrFormats: ["Dolby Vision"],
            audioFormats: ["DDP"],
            subtitleLanguages: ["zh"],
          },
          size: "86.69 GB",
          sizeBytes: 93082678723,
          magnetUrl: "magnet:?xt=urn:btih:complete-season",
          publishedAt: "2026-05-14",
          isNew: true,
        },
      ],
    };

    expect(formatResourcesResult(result)).toBe(`低智商犯罪 (2026)
1 torrent resources

1. S01 complete (24E) · 2160p · Dolby Vision
   WEB-DL · H.265/HEVC · BlackTV
   2026-05-14 · 86.69 GB · magnet:?xt=urn:btih:complete-season`);
  });
});
