import { describe, expect, it } from "vitest";
import { recommendResources } from "./recommendations.js";
import type { ResourcesResult, TorrentResource } from "./types.js";

interface ResourceOptions {
  id: number;
  quality: string;
  sizeGb?: number;
  frameRate?: number;
  isCompleteSeason?: boolean;
  isHighBitrate?: boolean;
  hdrFormats?: string[];
  videoCodec?: string;
  releaseGroup?: string;
}

function createResource(options: ResourceOptions): TorrentResource {
  return {
    id: options.id,
    name: `resource ${options.id}`,
    quality: options.quality,
    analysis: {
      ...(options.frameRate ? { frameRate: options.frameRate } : {}),
      ...(options.isCompleteSeason ? { isCompleteSeason: true } : {}),
      ...(options.isHighBitrate ? { isHighBitrate: true } : {}),
      ...(options.hdrFormats ? { hdrFormats: options.hdrFormats } : {}),
      ...(options.videoCodec ? { videoCodec: options.videoCodec } : {}),
      ...(options.releaseGroup ? { releaseGroup: options.releaseGroup } : {}),
    },
    size: options.sizeGb ? `${options.sizeGb} GB` : undefined,
    sizeBytes: options.sizeGb ? options.sizeGb * 1024 * 1024 * 1024 : undefined,
    isNew: false,
  };
}

function createResult(resources: TorrentResource[], overrides: Partial<ResourcesResult> = {}): ResourcesResult {
  return {
    doubanId: 1,
    title: "Test",
    type: "movie",
    totalCount: resources.length,
    matchingCount: resources.length,
    returnedCount: resources.length,
    filters: {},
    availableQualities: [...new Set(resources.map((resource) => resource.quality))],
    resources,
    ...overrides,
  };
}

describe("recommendResources", () => {
  it("uses the configured quality order and excludes oversized resources", () => {
    const oversizedWeb4k = createResource({
      id: 1,
      quality: "WEB-4K",
      sizeGb: 71,
      hdrFormats: ["HDR"],
    });
    const bluray4k = createResource({
      id: 2,
      quality: "4K蓝光",
      sizeGb: 30,
      hdrFormats: ["HDR"],
    });
    const web1080p = createResource({
      id: 3,
      quality: "WEB-1080P",
      sizeGb: 6,
      hdrFormats: ["HDR"],
    });

    expect(recommendResources(createResult([oversizedWeb4k, web1080p, bluray4k]), 1)).toEqual([
      bluray4k,
    ]);
  });

  it("excludes high frame rate resources before falling back to another quality", () => {
    const highFrameRateWeb4k = createResource({
      id: 1,
      quality: "WEB-4K",
      frameRate: 60,
      hdrFormats: ["HDR"],
    });
    const web1080p = createResource({
      id: 2,
      quality: "WEB-1080P",
      hdrFormats: ["HDR"],
    });

    expect(recommendResources(createResult([highFrameRateWeb4k, web1080p]), 1)).toEqual([
      web1080p,
    ]);
  });

  it("prefers HDR presence before high bitrate, then high bitrate before HDR format mix", () => {
    const noHdrHighBitrate = createResource({
      id: 1,
      quality: "WEB-4K",
      isHighBitrate: true,
    });
    const hdrNormalBitrate = createResource({
      id: 2,
      quality: "WEB-4K",
      hdrFormats: ["HDR", "Dolby Vision"],
    });
    const hdrHighBitrate = createResource({
      id: 3,
      quality: "WEB-4K",
      isHighBitrate: true,
      hdrFormats: ["HDR"],
    });

    expect(
      recommendResources(createResult([noHdrHighBitrate, hdrNormalBitrate, hdrHighBitrate]), 3),
    ).toEqual([hdrHighBitrate, hdrNormalBitrate, noHdrHighBitrate]);
  });

  it("prefers complete TV resources across qualities before latest fillers", () => {
    const web4kEpisodeOne = createResource({
      id: 1,
      quality: "WEB-4K",
      hdrFormats: ["HDR"],
    });
    const web4kEpisodeTwo = createResource({
      id: 2,
      quality: "WEB-4K",
      hdrFormats: ["HDR"],
      videoCodec: "H.265/HEVC",
    });
    const completeWeb1080p = createResource({
      id: 3,
      quality: "WEB-1080P",
      isCompleteSeason: true,
    });
    const completeDolbyVision = createResource({
      id: 4,
      quality: "杜比视界",
      isCompleteSeason: true,
    });
    const result = createResult([web4kEpisodeOne, web4kEpisodeTwo, completeWeb1080p, completeDolbyVision], {
      type: "tv",
    });

    expect(recommendResources(result, 3)).toEqual([
      completeDolbyVision,
      completeWeb1080p,
      web4kEpisodeOne,
    ]);
  });

  it("allows oversized complete TV resources", () => {
    const oversizedCompleteTv = createResource({
      id: 1,
      quality: "WEB-1080P",
      sizeGb: 81,
      isCompleteSeason: true,
    });
    const web4kEpisode = createResource({
      id: 2,
      quality: "WEB-4K",
      hdrFormats: ["HDR"],
    });
    const result = createResult([web4kEpisode, oversizedCompleteTv], {
      type: "tv",
    });

    expect(recommendResources(result, 3)).toEqual([oversizedCompleteTv, web4kEpisode]);
  });

  it("allows oversized TV resources with an explicit quality filter", () => {
    const oversizedWeb4kTv = createResource({
      id: 1,
      quality: "WEB-4K",
      sizeGb: 81,
      hdrFormats: ["HDR"],
    });
    const result = createResult([oversizedWeb4kTv], {
      type: "tv",
      filters: {
        quality: "WEB-4K",
      },
    });

    expect(recommendResources(result, 1)).toEqual([oversizedWeb4kTv]);
  });

  it("fills remaining TV recommendation slots by latest resource order after complete picks", () => {
    const web4kEpisode = createResource({
      id: 1,
      quality: "WEB-4K",
      hdrFormats: ["HDR"],
    });
    const completeWeb1080p = createResource({
      id: 2,
      quality: "WEB-1080P",
      isCompleteSeason: true,
    });
    const latestWeb1080pEpisode = createResource({
      id: 3,
      quality: "WEB-1080P",
    });
    const result = createResult([web4kEpisode, completeWeb1080p, latestWeb1080pEpisode], {
      type: "tv",
    });

    expect(recommendResources(result, 3)).toEqual([
      completeWeb1080p,
      web4kEpisode,
      latestWeb1080pEpisode,
    ]);
  });

  it("respects an explicit quality filter without TV fallback diversity", () => {
    const web4kEpisode = createResource({
      id: 1,
      quality: "WEB-4K",
      hdrFormats: ["HDR"],
    });
    const completeWeb1080p = createResource({
      id: 2,
      quality: "WEB-1080P",
      isCompleteSeason: true,
    });
    const result = createResult([web4kEpisode, completeWeb1080p], {
      type: "tv",
      filters: {
        quality: "WEB-4K",
      },
    });

    expect(recommendResources(result, 3)).toEqual([web4kEpisode]);
  });
});
