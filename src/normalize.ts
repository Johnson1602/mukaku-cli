import { MUKAKU_BASE_URL } from "./constants.js";
import type {
  MukakuMediaType,
  MukakuSearchItem,
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

function getAvailableQualities(detail: RawVideoDetail): string[] {
  return Object.keys(detail.ecca ?? {});
}

function countTorrentResources(detail: RawVideoDetail) {
  return Object.values(detail.ecca ?? {}).reduce(
    (count, resources) => count + resources.length,
    0,
  );
}

function getMatchingTorrentResources(
  detail: RawVideoDetail,
  filters: ResourcesFilters,
): TorrentResource[] {
  if (!filters.quality) {
    return normalizeTorrentResources(detail);
  }

  return sortTorrentResources(
    normalizeTorrentResourceGroup(
      detail.ecca?.[filters.quality] ?? [],
      filters.quality,
    ),
  );
}

function normalizeTorrentResourceGroup(
  resources: RawTorrentResource[],
  qualityGroup: string,
) {
  return resources.map((resource, index) => ({
    resource: normalizeTorrentResource(resource, qualityGroup),
    index,
  }));
}

function normalizeTorrentResource(
  item: RawTorrentResource,
  qualityGroup: string,
): TorrentResource {
  const quality = cleanOptionalString(item.zqxd) ?? qualityGroup;
  const size = cleanOptionalString(item.zsize);

  return {
    id: item.id,
    name: cleanOptionalString(item.zname) ?? "未知资源",
    quality,
    qualityGroup,
    size,
    sizeBytes: parseSizeBytes(size),
    magnetUrl: cleanOptionalString(item.zlink),
    torrentDownloadUrl: toAbsoluteUrl(item.down),
    publishedAt: cleanOptionalString(item.ezt),
    isNew: isNewResource(item.new),
  };
}

function sortTorrentResources(
  resources: { resource: TorrentResource; index: number }[],
): TorrentResource[] {
  return resources
    .map((item, index) => ({ ...item, index }))
    .sort(comparePublishedAtDescending)
    .map((item) => item.resource);
}

function comparePublishedAtDescending(
  left: { resource: TorrentResource; index: number },
  right: { resource: TorrentResource; index: number },
) {
  const leftDate = left.resource.publishedAt;
  const rightDate = right.resource.publishedAt;

  if (leftDate && rightDate && leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  if (leftDate && !rightDate) return -1;
  if (!leftDate && rightDate) return 1;

  return left.index - right.index;
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

function isNewResource(value: RawTorrentResource["new"]) {
  return value === true || value === 1;
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
    doubanUrl: doubanId ? `https://movie.douban.com/subject/${doubanId}/` : undefined,
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
    detailUrl: doubanId ? `${MUKAKU_BASE_URL}/mv/${doubanId}` : undefined,
  };
}

export function normalizeTorrentResources(
  detail: RawVideoDetail,
): TorrentResource[] {
  const groupedResources = detail.ecca ?? {};
  const indexedResources = Object.entries(groupedResources).flatMap(
    ([qualityGroup, resources]) =>
      normalizeTorrentResourceGroup(resources, qualityGroup),
  );

  return indexedResources
    .map((item, index) => ({ ...item, index }))
    .sort(comparePublishedAtDescending)
    .map((item) => item.resource);
}

export function buildResourcesResult(
  detail: RawVideoDetail,
  filters: ResourcesFilters = {},
): ResourcesResult {
  const availableQualities = getAvailableQualities(detail);
  const totalCount = countTorrentResources(detail);

  if (filters.quality && !availableQualities.includes(filters.quality)) {
    throw new Error(
      `Unknown quality "${filters.quality}". Available qualities: ${availableQualities.join(", ") || "none"}`,
    );
  }

  const matchingResources = getMatchingTorrentResources(detail, filters);
  const returnedResources = filters.limit
    ? matchingResources.slice(0, filters.limit)
    : matchingResources;

  return {
    doubanId: detail.doub_id,
    mukakuId: detail.id,
    title: cleanOptionalString(detail.title) ?? "未知标题",
    originalTitle: cleanOptionalString(detail.otitle),
    year: parseYear(detail.years),
    type: mapType(detail.type),
    totalCount,
    matchingCount: matchingResources.length,
    returnedCount: returnedResources.length,
    filters,
    availableQualities,
    resources: returnedResources,
  };
}
