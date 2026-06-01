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
  if (result.recommendations) {
    return `${result.recommendations.length} recommended torrent resources`;
  }

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

function formatEpisodeRange(resource: TorrentResource) {
  const episodeRange = resource.analysis?.episodeRange;

  if (!episodeRange) {
    return undefined;
  }

  return episodeRange.start === episodeRange.end
    ? `E${episodeRange.start}`
    : `E${episodeRange.start}-${episodeRange.end}`;
}

function formatEpisodeCoverage(resource: TorrentResource) {
  const analysis = resource.analysis;
  const episodeRange = analysis?.episodeRange;
  const season = analysis?.season
    ? `S${String(analysis.season).padStart(2, "0")}`
    : undefined;

  if (!episodeRange) {
    return season;
  }

  if (analysis?.isCompleteSeason) {
    const episodeCount = episodeRange.end - episodeRange.start + 1;
    return season
      ? `${season} complete (${episodeCount}E)`
      : `complete (${episodeCount}E)`;
  }

  const formattedRange = formatEpisodeRange(resource);
  return [season, formattedRange].filter(Boolean).join(" ");
}

function hasChineseSubtitles(resource: TorrentResource) {
  return resource.analysis?.subtitleLanguages?.some((language) =>
    ["zh", "zh-Hans", "zh-Hant"].includes(language),
  );
}

function formatViewingParts(resource: TorrentResource) {
  const analysis = resource.analysis;

  if (!analysis) {
    return [];
  }

  const parts = [
    formatEpisodeCoverage(resource),
    analysis.resolution,
    analysis.frameRate ? `${analysis.frameRate}fps` : undefined,
    analysis.isHighBitrate ? "High bitrate" : undefined,
    ...(analysis.hdrFormats ?? []),
    analysis.subtitleLanguages && !hasChineseSubtitles(resource)
      ? "zh unavailable"
      : undefined,
  ];

  return parts.filter(Boolean);
}

function formatReleaseParts(resource: TorrentResource) {
  const analysis = resource.analysis;

  if (!analysis) {
    return [];
  }

  return [
    analysis.source,
    analysis.webProvider,
    analysis.videoCodec,
    analysis.releaseGroup,
  ].filter(Boolean);
}

function formatAvailabilityParts(resource: TorrentResource) {
  return [resource.publishedAt, resource.size, resource.magnetUrl].filter(Boolean);
}

export function formatResourcesResult(result: ResourcesResult): string {
  const lines = [formatTitle(result), formatCountHeading(result)];
  const resources = result.recommendations ?? result.resources;

  if (result.filters.quality) {
    lines.push(`Quality: ${result.filters.quality}`);
  }

  if (resources.length === 0) {
    const emptyMessage = result.recommendations
      ? "No recommended torrent resources found."
      : "No torrent resources found.";
    lines.push("", emptyMessage);
    return lines.join("\n");
  }

  lines.push(
    "",
    resources
      .map((resource, index) => {
        const viewingParts = formatViewingParts(resource);
        const heading = [
          `${index + 1}.`,
          viewingParts.length > 0 ? viewingParts.join(" · ") : undefined,
        ]
          .filter(Boolean)
          .join(" ");
        const resourceLines = [heading];
        const releaseParts = formatReleaseParts(resource);
        const availabilityParts = formatAvailabilityParts(resource);

        if (releaseParts.length > 0) {
          resourceLines.push(`   ${releaseParts.join(" · ")}`);
        }

        if (availabilityParts.length > 0) {
          resourceLines.push(`   ${availabilityParts.join(" · ")}`);
        }

        return resourceLines.join("\n");
      })
      .join("\n\n"),
  );

  return lines.join("\n");
}

export function printResourcesResult(result: ResourcesResult): void {
  console.log(formatResourcesResult(result));
}
