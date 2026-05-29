import { Command } from "commander";
import { fetchRawSearchResponse, searchMukaku } from "../api/search.js";
import { normalizeSearchItems } from "../normalize.js";
import { parsePositiveInteger } from "../options.js";
import { printSearchResults } from "../output.js";

interface SearchOptions {
  limit: number;
  page: number;
  json?: boolean;
  raw?: boolean;
}

function assertValidRawOptions(options: SearchOptions): void {
  if (options.raw && options.json) {
    throw new Error("--raw cannot be combined with --json");
  }
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search movies and TV shows")
    .argument("<query>", "search keyword, for example 阿凡达")
    .option(
      "-l, --limit <number>",
      "maximum number of results to print",
      parsePositiveInteger,
      10,
    )
    .option("-p, --page <number>", "result page to request", parsePositiveInteger, 1)
    .option("--json", "print normalized JSON")
    .option("--raw", "print raw Mukaku API response")
    .action(async (query: string, options: SearchOptions) => {
      try {
        assertValidRawOptions(options);

        if (options.raw) {
          const rawResponse = await fetchRawSearchResponse({
            query,
            page: options.page,
            limit: options.limit,
          });
          console.log(JSON.stringify(rawResponse, null, 2));
          return;
        }

        const response = await searchMukaku({
          query,
          page: options.page,
          limit: options.limit,
        });
        const results = normalizeSearchItems(response.data.data).slice(0, options.limit);

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        printSearchResults(results);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error: ${message}`);
        process.exitCode = 1;
      }
    });
}
