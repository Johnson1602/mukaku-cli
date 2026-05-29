import { Command } from "commander";
import {
  fetchRawVideoDetailResponse,
  getVideoDetail,
} from "../api/video-detail.js";
import { buildResourcesResult } from "../normalize.js";
import { parsePositiveInteger } from "../options.js";
import { printResourcesResult } from "../output.js";

interface ResourcesOptions {
  quality?: string;
  limit?: number;
  json?: boolean;
  raw?: boolean;
}

function assertValidRawOptions(options: ResourcesOptions): void {
  const rawModifiers = [
    options.json ? "--json" : undefined,
    options.quality ? "--quality" : undefined,
    options.limit ? "--limit" : undefined,
  ].filter(Boolean);

  if (options.raw && rawModifiers.length > 0) {
    throw new Error(`--raw cannot be combined with ${rawModifiers.join(", ")}`);
  }
}

export function registerResourcesCommand(program: Command): void {
  program
    .command("resources")
    .description("List normalized torrent resources for a Mukaku detail page")
    .argument("<douban-id>", "Douban subject id used by Mukaku detail pages", parsePositiveInteger)
    .option("--quality <quality>", "filter by exact Mukaku quality group")
    .option("--limit <number>", "maximum number of resources to print", parsePositiveInteger)
    .option("--json", "print normalized JSON")
    .option("--raw", "print raw Mukaku API response")
    .action(async (doubanId: number, options: ResourcesOptions) => {
      try {
        assertValidRawOptions(options);

        if (options.raw) {
          const rawResponse = await fetchRawVideoDetailResponse({ doubanId });
          console.log(JSON.stringify(rawResponse, null, 2));
          return;
        }

        const response = await getVideoDetail({ doubanId });
        const result = buildResourcesResult(response.data, {
          quality: options.quality,
          limit: options.limit,
        });

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
