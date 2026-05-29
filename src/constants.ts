export const DOUBAN_BASE_URL = "https://movie.douban.com";
export const MUKAKU_BASE_URL = "https://web5.mukaku.com";

export function getDoubanUrl(doubanId: number): string {
  return new URL(`/subject/${doubanId}/`, DOUBAN_BASE_URL).toString();
}

export function getMukakuDetailUrl(doubanId: number): string {
  return new URL(`/mv/${doubanId}`, MUKAKU_BASE_URL).toString();
}
