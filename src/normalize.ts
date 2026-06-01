import {
  MUKAKU_BASE_URL,
  getDoubanUrl,
  getMukakuDetailUrl,
} from "./constants.js";
import { analyzeTorrentResourceTitle } from "./resource-analysis.js";
import type {
  MukakuMediaType,
  MukakuSearchItem,
  MukakuVideoDetail,
  RawMukakuItem,
  RawTorrentResource,
  RawVideoDetail,
  ResourcesFilters,
  ResourcesResult,
  TorrentResource,
} from "./types.js";

function cleanOptionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePositiveNumber(value: string | undefined) {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseYear(value: string | undefined) {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const year = Number(text);
  return Number.isInteger(year) ? year : undefined;
}

function parseCsv(value: string | undefined) {
  return cleanOptionalString(value)
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function mapType(type: number | undefined): MukakuMediaType {
  if (type === 1) return "movie";
  if (type === 2) return "tv";
  return "unknown";
}

function normalizeTorrentResource(item: RawTorrentResource): TorrentResource {
  const quality =
    cleanOptionalString(item.definition_group) ??
    cleanOptionalString(item.zqxd) ??
    "unknown";
  const name = cleanOptionalString(item.zname) ?? "未知资源";
  const size = cleanOptionalString(item.zsize);
  const analysis = analyzeTorrentResourceTitle(name);

  return {
    id: item.id,
    name,
    quality,
    ...(analysis ? { analysis } : {}),
    size,
    sizeBytes: parseSizeBytes(size),
    magnetUrl: cleanOptionalString(item.zlink),
    torrentDownloadUrl: toAbsoluteUrl(item.down),
    publishedAt: cleanOptionalString(item.ezt),
    isNew: item.new === true || item.new === 1,
  };
}

function parseSizeBytes(value: string | undefined) {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const match = /^([\d.]+)\s*(B|KB|MB|GB|TB)$/i.exec(text);
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return undefined;

  const unit = match[2].toUpperCase();
  const multiplier =
    unit === "B"
      ? 1
      : unit === "KB"
        ? 1024
        : unit === "MB"
          ? 1024 ** 2
          : unit === "GB"
            ? 1024 ** 3
            : 1024 ** 4;

  return Math.round(amount * multiplier);
}

function toAbsoluteUrl(value: string | undefined) {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  return new URL(text, MUKAKU_BASE_URL).toString();
}

export function normalizeSearchItems(items: RawMukakuItem[]): MukakuSearchItem[] {
  return items.map(normalizeSearchItem);
}

export function normalizeSearchItem(item: RawMukakuItem): MukakuSearchItem {
  const doubanId = item.doub_id;

  return {
    title: cleanOptionalString(item.title) ?? "未知标题",
    originalTitle: cleanOptionalString(item.otitle),
    year: parseYear(item.years),
    type: mapType(item.type),
    doubanId,
    doubanUrl: doubanId ? getDoubanUrl(doubanId) : undefined,
    doubanScore: parsePositiveNumber(item.doub_score),
    imdbId: cleanOptionalString(item.IMDB_number),
    imdbScore: parsePositiveNumber(item.IMDB_score),
    quality: cleanOptionalString(item.zqxd),
    episodeStatus: cleanOptionalString(item.ejs),
    categories: parseCsv(item.class),
    productionArea: cleanOptionalString(item.production_area),
    definitions: parseCsv(item.definition),
    seedUpdatedAt: cleanOptionalString(item.seed_updated_at),
    image: cleanOptionalString(item.image),
    detailUrl: doubanId ? getMukakuDetailUrl(doubanId) : undefined,
  };
}

export function normalizeVideoDetail(detail: RawVideoDetail): MukakuVideoDetail {
  const resourcesByQuality = Object.fromEntries(
    Object.entries(detail.ecca ?? {}).map(([quality, resources]) => [
      quality,
      resources.map(normalizeTorrentResource),
    ]),
  );
  const resources = (detail.all_seeds ?? []).map(normalizeTorrentResource);
  const groupedResourceCount = Object.values(resourcesByQuality).reduce(
    (count, qualityResources) => count + qualityResources.length,
    0,
  );

  return {
    doubanId: detail.doub_id,
    mukakuId: detail.id,
    title: cleanOptionalString(detail.title) ?? "未知标题",
    originalTitle: cleanOptionalString(detail.otitle),
    year: parseYear(detail.years),
    type: mapType(detail.type),
    totalCount: resources.length || groupedResourceCount,
    availableQualities: Object.keys(resourcesByQuality),
    resources,
    resourcesByQuality,
  };
}

export function buildResourcesResult(
  detail: MukakuVideoDetail,
  filters: ResourcesFilters = {},
): ResourcesResult {
  if (filters.quality && !detail.availableQualities.includes(filters.quality)) {
    throw new Error(
      `Unknown quality "${filters.quality}". Available qualities: ${detail.availableQualities.join(", ") || "none"}`,
    );
  }

  const matchingResources = filters.quality
    ? detail.resourcesByQuality[filters.quality] ?? []
    : detail.resources;
  const limitedResources = filters.limit
    ? matchingResources.slice(0, filters.limit)
    : matchingResources;
  const { resourcesByQuality: _resourcesByQuality, ...summary } = detail;

  return {
    ...summary,
    matchingCount: matchingResources.length,
    returnedCount: limitedResources.length,
    filters,
    resources: limitedResources,
  };
}
