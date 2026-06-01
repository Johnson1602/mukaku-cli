import type { ResourcesResult, TorrentResource } from "./types.js";

const QUALITY_ORDER = [
  "WEB-4K",
  "杜比视界",
  "4K蓝光",
  "WEB-1080P",
  "蓝光原盘",
  "1080P蓝光",
  "4K蓝光原盘",
  "其他",
] as const;

const MAX_RECOMMENDED_SIZE_BYTES = 70 * 1024 * 1024 * 1024;
const LARGE_SIZE_WARNING_BYTES = 50 * 1024 * 1024 * 1024;
const HIGH_FRAME_RATE = 50;

function hasKnownReleaseGroup(resource: TorrentResource) {
  return resource.analysis?.releaseGroup !== undefined;
}

function hasHdrFormat(resource: TorrentResource) {
  return (resource.analysis?.hdrFormats?.length ?? 0) > 0;
}

function hdrFormatScore(resource: TorrentResource) {
  const hdrFormats = resource.analysis?.hdrFormats ?? [];
  const hasHdr = hdrFormats.some((format) => format !== "Dolby Vision");
  const hasDolbyVision = hdrFormats.includes("Dolby Vision");

  if (hasHdr && hasDolbyVision) {
    return 3;
  }

  if (hasHdr) {
    return 2;
  }

  if (hasDolbyVision) {
    return 1;
  }

  return 0;
}

function hasH265(resource: TorrentResource) {
  return resource.analysis?.videoCodec === "H.265/HEVC";
}

function isHighFrameRate(resource: TorrentResource) {
  return (resource.analysis?.frameRate ?? 0) >= HIGH_FRAME_RATE;
}

function isOversized(resource: TorrentResource) {
  return (resource.sizeBytes ?? 0) > MAX_RECOMMENDED_SIZE_BYTES;
}

function isLarge(resource: TorrentResource) {
  return (resource.sizeBytes ?? 0) > LARGE_SIZE_WARNING_BYTES;
}

function isMovieEligible(resource: TorrentResource) {
  return !isOversized(resource) && !isHighFrameRate(resource);
}

function isTvEligible(resource: TorrentResource) {
  return !isHighFrameRate(resource);
}

function getResourceOrder(resources: TorrentResource[]) {
  return new Map(resources.map((resource, index) => [resource, index]));
}

function compareBoolean(left: boolean, right: boolean) {
  return Number(right) - Number(left);
}

function compareNumber(left: number, right: number) {
  return right - left;
}

function getQualityRank(resource: TorrentResource) {
  const qualityRank = QUALITY_ORDER.indexOf(resource.quality as (typeof QUALITY_ORDER)[number]);

  return qualityRank === -1 ? QUALITY_ORDER.length : qualityRank;
}

function compareQuality(left: TorrentResource, right: TorrentResource) {
  return getQualityRank(left) - getQualityRank(right);
}

function compareRecommendedResources(
  left: TorrentResource,
  right: TorrentResource,
  resourceOrder: Map<TorrentResource, number>,
) {
  return (
    compareBoolean(left.analysis?.isCompleteSeason === true, right.analysis?.isCompleteSeason === true) ||
    compareBoolean(hasKnownReleaseGroup(left), hasKnownReleaseGroup(right)) ||
    compareBoolean(hasHdrFormat(left), hasHdrFormat(right)) ||
    compareBoolean(left.analysis?.isHighBitrate === true, right.analysis?.isHighBitrate === true) ||
    compareNumber(hdrFormatScore(left), hdrFormatScore(right)) ||
    compareBoolean(hasH265(left), hasH265(right)) ||
    compareBoolean(!isLarge(left), !isLarge(right)) ||
    compareNumber(left.sizeBytes ?? 0, right.sizeBytes ?? 0) ||
    (resourceOrder.get(left) ?? 0) - (resourceOrder.get(right) ?? 0)
  );
}

function sortRecommendedResources(resources: TorrentResource[], resourceOrder: Map<TorrentResource, number>) {
  return [...resources].sort((left, right) =>
    compareRecommendedResources(left, right, resourceOrder),
  );
}

function sortCompleteTvResources(resources: TorrentResource[], resourceOrder: Map<TorrentResource, number>) {
  return [...resources].sort(
    (left, right) =>
      compareQuality(left, right) ||
      compareRecommendedResources(left, right, resourceOrder),
  );
}

function sortLatestResources(resources: TorrentResource[], resourceOrder: Map<TorrentResource, number>) {
  return [...resources].sort(
    (left, right) => (resourceOrder.get(left) ?? 0) - (resourceOrder.get(right) ?? 0),
  );
}

function getAutomaticQuality(resources: TorrentResource[]) {
  const knownQuality = QUALITY_ORDER.find((quality) =>
    resources.some((resource) => resource.quality === quality && isMovieEligible(resource)),
  );

  return knownQuality ?? resources.find(isMovieEligible)?.quality;
}

function getPrimaryCandidates(result: ResourcesResult) {
  const quality = result.filters.quality ?? getAutomaticQuality(result.resources);

  if (!quality) {
    return [];
  }

  const isEligible = result.type === "tv" ? isTvEligible : isMovieEligible;

  return result.resources.filter((resource) => resource.quality === quality && isEligible(resource));
}

function recommendTvResources(result: ResourcesResult, count: number): TorrentResource[] | undefined {
  if (result.type !== "tv" || result.filters.quality) {
    return undefined;
  }

  const resourceOrder = getResourceOrder(result.resources);
  const completeRecommendations = sortCompleteTvResources(
    result.resources.filter(
      (resource) => resource.analysis?.isCompleteSeason === true && isTvEligible(resource),
    ),
    resourceOrder,
  );

  if (completeRecommendations.length === 0) {
    return undefined;
  }

  const recommendations = completeRecommendations.slice(0, count);

  if (recommendations.length >= count) {
    return recommendations;
  }

  const recommendedResources = new Set(recommendations);
  const latestFillers = sortLatestResources(
    result.resources.filter(
      (resource) => isTvEligible(resource) && !recommendedResources.has(resource),
    ),
    resourceOrder,
  ).slice(0, count - recommendations.length);

  return [...recommendations, ...latestFillers];
}

export function recommendResources(
  result: ResourcesResult,
  count: number,
): TorrentResource[] {
  const tvRecommendations = recommendTvResources(result, count);

  if (tvRecommendations) {
    return tvRecommendations;
  }

  const resourceOrder = getResourceOrder(result.resources);
  const primaryRecommendations = sortRecommendedResources(
    getPrimaryCandidates(result),
    resourceOrder,
  ).slice(0, count);
  return primaryRecommendations;
}
