import { MUKAKU_BASE_URL } from "./constants.js";
import type { MukakuSearchItem, RawMukakuItem } from "./types.js";

function cleanOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePositiveNumber(value: string | undefined): number | undefined {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function parseYear(value: string | undefined): number | undefined {
  const text = cleanOptionalString(value);
  if (!text) return undefined;

  const year = Number(text);
  return Number.isInteger(year) ? year : undefined;
}

function parseCsv(value: string | undefined): string[] {
  return cleanOptionalString(value)
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function mapType(type: number | undefined): MukakuSearchItem["type"] {
  if (type === 1) return "movie";
  if (type === 2) return "tv";
  return "unknown";
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

export function normalizeSearchItems(items: RawMukakuItem[]): MukakuSearchItem[] {
  return items.map(normalizeSearchItem);
}
