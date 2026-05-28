import { Command } from "commander";
import { fetchRawSearchResponse, searchMukaku } from "../client.js";
import { normalizeSearchItems } from "../normalize.js";
import { printSearchResults } from "../output.js";

interface SearchOptions {
  limit: string;
  page: string;
  json?: boolean;
  raw?: boolean;
}

export function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search movies and TV shows")
    .argument("<query>", "search keyword, for example 阿凡达")
    .option("-l, --limit <number>", "maximum number of results to print", "10")
    .option("-p, --page <number>", "result page to request", "1")
    .option("--json", "print normalized JSON")
    .option("--raw", "print raw Mukaku API response")
    .action(async (query: string, options: SearchOptions) => {
      try {
        const limit = Number(options.limit);
        const page = Number(options.page);

        if (!Number.isInteger(limit) || limit <= 0) {
          throw new Error("--limit must be a positive integer");
        }

        if (!Number.isInteger(page) || page <= 0) {
          throw new Error("--page must be a positive integer");
        }

        if (options.raw) {
          const rawResponse = await fetchRawSearchResponse({ query, page, limit });
          console.log(JSON.stringify(rawResponse, null, 2));
          return;
        }

        const response = await searchMukaku({ query, page, limit });
        const results = normalizeSearchItems(response.data.data).slice(0, limit);

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
