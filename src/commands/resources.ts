import { Command } from "commander";
import {
  fetchRawVideoDetailResponse,
  getVideoDetail,
} from "../api/video-detail.js";
import { buildResourcesResult } from "../normalize.js";
import { parsePositiveInteger } from "../options.js";
import { printResourcesResult } from "../output.js";
import { recommendResources } from "../recommendations.js";

interface ResourcesOptions {
  quality?: string;
  limit?: number;
  recommend?: boolean | number;
  json?: boolean;
  raw?: boolean;
}

function parseRecommendationCount(value: string): number {
  return parsePositiveInteger(value);
}

function resolveRecommendationCount(value: ResourcesOptions["recommend"]): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  return value ? 3 : undefined;
}

function assertValidRawOptions(options: ResourcesOptions): void {
  const rawModifiers = [
    options.json ? "--json" : undefined,
    options.quality ? "--quality" : undefined,
    options.limit ? "--limit" : undefined,
    options.recommend ? "--recommend" : undefined,
  ].filter(Boolean);

  if (options.raw && rawModifiers.length > 0) {
    throw new Error(`--raw cannot be combined with ${rawModifiers.join(", ")}`);
  }
}

function assertValidRecommendationOptions(options: ResourcesOptions): void {
  if (options.recommend && options.limit) {
    throw new Error("--recommend cannot be combined with --limit");
  }
}

export function registerResourcesCommand(program: Command): void {
  program
    .command("resources")
    .description("List normalized torrent resources for a Mukaku detail page")
    .argument("<douban-id>", "Douban subject id used by Mukaku detail pages", parsePositiveInteger)
    .option("--quality <quality>", "filter by exact Mukaku quality group")
    .option("--limit <number>", "maximum number of resources to print", parsePositiveInteger)
    .option("--recommend [number]", "print recommended torrent resources", parseRecommendationCount)
    .option("--json", "print normalized JSON")
    .option("--raw", "print raw Mukaku API response")
    .action(async (doubanId: number, options: ResourcesOptions) => {
      try {
        assertValidRawOptions(options);
        assertValidRecommendationOptions(options);

        if (options.raw) {
          const rawResponse = await fetchRawVideoDetailResponse({ doubanId });
          console.log(JSON.stringify(rawResponse, null, 2));
          return;
        }

        const response = await getVideoDetail({ doubanId });
        const result = buildResourcesResult(response, {
          quality: options.quality,
          limit: options.limit,
        });
        const recommendationCount = resolveRecommendationCount(options.recommend);

        if (recommendationCount) {
          result.recommendations = recommendResources(result, recommendationCount);
        }

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        printResourcesResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
