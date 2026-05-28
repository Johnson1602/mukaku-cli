import type { MukakuSearchItem } from "./types.js";

function formatScore(label: string, value: number | undefined) {
  return value === undefined ? undefined : `${label} ${value}`;
}

export function formatSearchResults(results: MukakuSearchItem[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((result, index) => {
      const lines: string[] = [];

      const headingParts = [
        `${index + 1}. ${result.title}`,
        result.year ? `(${result.year})` : undefined,
        result.quality,
        result.episodeStatus,
      ].filter(Boolean);

      lines.push(headingParts.join(" "));

      if (result.originalTitle) {
        lines.push(`   Original: ${result.originalTitle}`);
      }

      const scores = [
        formatScore("豆瓣", result.doubanScore),
        formatScore("IMDb", result.imdbScore),
      ].filter(Boolean);

      if (scores.length > 0) {
        lines.push(`   Rating: ${scores.join(" / ")}`);
      }

      const meta = [
        result.type,
        result.productionArea,
        result.categories.length > 0 ? result.categories.join(", ") : undefined,
      ].filter(Boolean);

      if (meta.length > 0) {
        lines.push(`   Meta: ${meta.join(" | ")}`);
      }

      if (result.detailUrl) {
        lines.push(`   资源 URL: ${result.detailUrl}`);
      }

      if (result.doubanUrl) {
        lines.push(`   豆瓣 URL: ${result.doubanUrl}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function printSearchResults(results: MukakuSearchItem[]): void {
  console.log(formatSearchResults(results));
}
