import type { MukakuSearchItem, ResourcesResult, TorrentResource } from "./types.js";

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

function formatTitle(result: ResourcesResult) {
  return result.year ? `${result.title} (${result.year})` : result.title;
}

function formatCountHeading(result: ResourcesResult) {
  const hasQualityFilter = result.filters.quality !== undefined;
  const hasLimit = result.filters.limit !== undefined;

  if (hasQualityFilter && hasLimit) {
    return `Showing ${result.returnedCount} of ${result.matchingCount} matching torrent resources (${result.totalCount} total)`;
  }

  if (hasQualityFilter) {
    return `${result.matchingCount} matching torrent resources (${result.totalCount} total)`;
  }

  if (hasLimit) {
    return `Showing ${result.returnedCount} of ${result.totalCount} torrent resources`;
  }

  return `${result.totalCount} torrent resources`;
}

function formatResourceMeta(resource: TorrentResource) {
  return [
    resource.size,
    resource.publishedAt,
    resource.isNew ? "NEW" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatResourcesResult(result: ResourcesResult): string {
  const lines = [formatTitle(result), formatCountHeading(result)];

  if (result.filters.quality) {
    lines.push(`Quality: ${result.filters.quality}`);
  }

  if (result.resources.length === 0) {
    lines.push("", "No torrent resources found.");
    return lines.join("\n");
  }

  lines.push(
    "",
    ...result.resources.flatMap((resource, index) => {
      const resourceLines = [`${index + 1}. ${resource.name}`];
      const meta = formatResourceMeta(resource);

      if (meta) {
        resourceLines.push(`   ${meta}`);
      }

      return resourceLines;
    }),
  );

  return lines.join("\n");
}

export function printResourcesResult(result: ResourcesResult): void {
  console.log(formatResourcesResult(result));
}
